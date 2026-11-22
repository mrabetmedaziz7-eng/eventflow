"use client";

/**
 * Small custom i18n layer (no routing changes).
 * - Dictionaries live in src/locales/{fr,en,ar}.json
 * - The chosen language is persisted in localStorage ("eventflow.lang")
 * - <html lang> and <html dir> are updated, and the Bootstrap stylesheet is
 *   switched to its RTL build for Arabic
 * - Dates, numbers and prices are formatted with Intl for the active language
 */
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import fr from "@/locales/fr.json";
import en from "@/locales/en.json";
import ar from "@/locales/ar.json";

export type Lang = "fr" | "en" | "ar";
export const LANGS: Lang[] = ["fr", "en", "ar"];
export const DEFAULT_LANG: Lang = "fr";
export const LANG_STORAGE_KEY = "eventflow.lang";
export const CURRENCY = "TND";

type Dictionary = { [key: string]: string | Dictionary };
const DICTIONARIES: Record<Lang, Dictionary> = { fr, en, ar };

const INTL_LOCALES: Record<Lang, string> = { fr: "fr-TN", en: "en-GB", ar: "ar-TN" };

export const BOOTSTRAP_CSS = {
  ltr: "/vendor/bootstrap.min.css",
  rtl: "/vendor/bootstrap.rtl.min.css",
} as const;

export function isLang(value: unknown): value is Lang {
  return typeof value === "string" && (LANGS as string[]).includes(value);
}

export function dirFor(lang: Lang): "ltr" | "rtl" {
  return lang === "ar" ? "rtl" : "ltr";
}

function lookup(dict: Dictionary, key: string): string | undefined {
  let node: string | Dictionary | undefined = dict;
  for (const part of key.split(".")) {
    if (node === undefined || typeof node === "string") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

export type TranslateVars = Record<string, string | number>;

/** Pure translate function (exported for tests and non-React code). */
export function translate(lang: Lang, key: string, vars?: TranslateVars): string {
  const raw = lookup(DICTIONARIES[lang], key) ?? lookup(DICTIONARIES[DEFAULT_LANG], key) ?? key;
  if (!vars) return raw;
  return raw.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match));
}

/** Returns true when the key exists in the dictionary of the given language. */
export function hasKey(lang: Lang, key: string): boolean {
  return lookup(DICTIONARIES[lang], key) !== undefined;
}

/** Applies lang/dir on <html> and swaps the Bootstrap stylesheet (LTR / RTL). */
export function applyDocumentLanguage(lang: Lang): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  html.lang = lang;
  html.dir = dirFor(lang);
  const link = document.getElementById("bootstrap-css") as HTMLLinkElement | null;
  const href = lang === "ar" ? BOOTSTRAP_CSS.rtl : BOOTSTRAP_CSS.ltr;
  if (link && link.getAttribute("href") !== href) link.setAttribute("href", href);
}

/**
 * Inline script executed before the first paint so that an Arabic user does not
 * see a flash of LTR content.
 */
export const LANGUAGE_BOOT_SCRIPT = `(function(){try{var l=localStorage.getItem('${LANG_STORAGE_KEY}');if(l!=='fr'&&l!=='en'&&l!=='ar'){l='${DEFAULT_LANG}';}var h=document.documentElement;h.lang=l;h.dir=l==='ar'?'rtl':'ltr';var b=document.getElementById('bootstrap-css');if(b){b.setAttribute('href',l==='ar'?'${BOOTSTRAP_CSS.rtl}':'${BOOTSTRAP_CSS.ltr}');}}catch(e){}})();`;

// ---------------------------------------------------------------- formatting

function parseLocalDate(isoDate: string): Date {
  // "YYYY-MM-DD" (calendar date, no timezone) -> local midnight
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function createFormatters(lang: Lang) {
  const locale = INTL_LOCALES[lang];
  return {
    /** Calendar date from the API ("2026-10-27"). */
    formatDate(isoDate: string | null | undefined, style: "long" | "short" = "long"): string {
      if (!isoDate) return "";
      const date = parseLocalDate(isoDate);
      if (Number.isNaN(date.getTime())) return isoDate;
      return new Intl.DateTimeFormat(locale, style === "long"
        ? { weekday: "long", day: "numeric", month: "long", year: "numeric" }
        : { day: "2-digit", month: "short", year: "numeric" }).format(date);
    },
    /** Local time of day from the API ("09:00:00"). */
    formatTime(time: string | null | undefined): string {
      if (!time) return "";
      const [h, m] = time.split(":").map(Number);
      const date = new Date(2000, 0, 1, h || 0, m || 0);
      return new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit" }).format(date);
    },
    /** UTC ISO timestamp from the API -> local date and time. */
    formatDateTime(timestamp: string | null | undefined): string {
      if (!timestamp) return "";
      const date = new Date(timestamp);
      if (Number.isNaN(date.getTime())) return timestamp;
      return new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(date);
    },
    formatNumber(value: number | null | undefined, maximumFractionDigits = 0): string {
      return new Intl.NumberFormat(locale, { maximumFractionDigits }).format(Number(value ?? 0));
    },
    formatPercent(value: number | null | undefined): string {
      return new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(Number(value ?? 0) / 100);
    },
    formatPrice(value: number | null | undefined): string {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: CURRENCY,
        minimumFractionDigits: 2,
        maximumFractionDigits: 3,
      }).format(Number(value ?? 0));
    },
  };
}

export type Formatters = ReturnType<typeof createFormatters>;

// ---------------------------------------------------------------- React context

export interface I18nContextValue extends Formatters {
  lang: Lang;
  dir: "ltr" | "rtl";
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: TranslateVars) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children, initialLang }: { children: ReactNode; initialLang?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initialLang ?? DEFAULT_LANG);

  // Restore the persisted language after mount (the boot script already set <html>).
  useEffect(() => {
    if (initialLang) return;
    try {
      const stored = window.localStorage.getItem(LANG_STORAGE_KEY);
      if (isLang(stored) && stored !== DEFAULT_LANG) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time sync from browser storage
        setLangState(stored);
      }
    } catch {
      /* storage unavailable: keep default */
    }
  }, [initialLang]);

  useEffect(() => {
    applyDocumentLanguage(lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<I18nContextValue>(() => ({
    lang,
    dir: dirFor(lang),
    setLang,
    t: (key, vars) => translate(lang, key, vars),
    ...createFormatters(lang),
  }), [lang, setLang]);

  return createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}

