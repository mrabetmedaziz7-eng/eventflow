/**
 * Turns an ApiError into translated, human messages.
 * Backend messages are written in French: they are shown as-is in French and
 * replaced by translated messages (by error code) in the other languages.
 */
import { ApiError } from "@/lib/api";
import { hasKey, translate, type Lang } from "@/lib/i18n";
import type { FieldErrors } from "@/lib/validation";

export function errorMessage(error: unknown, lang: Lang, overrides: Record<string, string> = {}): string {
  if (error instanceof ApiError) {
    if (overrides[error.code]) return translate(lang, overrides[error.code]);
    const key = `errors.codes.${error.code}`;
    if (hasKey(lang, key)) return translate(lang, key);
    if (lang === "fr" && error.message) return error.message;
    return translate(lang, error.status >= 500 ? "errors.codes.SERVER_ERROR" : "errors.generic");
  }
  return translate(lang, "errors.generic");
}

/** Field errors from the API (details.fields or fields), ready to display. */
export function apiFieldErrors(error: unknown, lang: Lang): FieldErrors {
  if (!(error instanceof ApiError)) return {};
  const result: FieldErrors = {};
  for (const [field, message] of Object.entries(error.fields)) {
    result[field] = lang === "fr" && message ? message : translate(lang, "validation.serverInvalid");
  }
  return result;
}

