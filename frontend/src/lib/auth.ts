"use client";

/**
 * Session management.
 * - The JWT is kept in memory (api.ts) and in sessionStorage, never in localStorage:
 *   it disappears when the tab is closed and is not shared between tabs.
 * - The user object is NOT persisted: on page load the session is restored by
 *   calling GET /api/users/me with the stored token (loading state meanwhile).
 * - Logout (or a 401 from the backend) clears everything.
 */
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { authApi, setApiToken, setUnauthorizedHandler, usersApi } from "@/lib/api";
import type { LoginRequest, Role, User } from "@/types/api";

export const TOKEN_STORAGE_KEY = "eventflow.token";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string | null): void {
  setApiToken(token);
  try {
    if (token) window.sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    else window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    /* storage unavailable: memory only */
  }
}

/** Home page of each role after login. */
export function dashboardPathFor(role: Role): string {
  switch (role) {
    case "ADMIN":
      return "/dashboard/admin";
    case "ENSEIGNANT":
      return "/dashboard/teacher";
    default:
      return "/dashboard/student";
  }
}

export interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (credentials: LoginRequest) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [user, setUserState] = useState<User | null>(null);
  const restoring = useRef(false);

  const clearSession = useCallback(() => {
    storeToken(null);
    setUserState(null);
    setStatus("anonymous");
  }, []);

  // Session restore on page load.
  useEffect(() => {
    if (restoring.current) return;
    restoring.current = true;
    const token = readStoredToken();
    if (!token) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initial sync from browser storage
      setStatus("anonymous");
      return;
    }
    setApiToken(token);
    usersApi
      .me()
      .then((me) => {
        setUserState(me);
        setStatus("authenticated");
      })
      .catch(() => clearSession());
  }, [clearSession]);

  // Global 401 handler: clear the session and go to the login page.
  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        // Full reload ensures all React query/state tree is wiped clean
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/login?expired=1");
      }
    });
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await authApi.login(credentials);
    storeToken(response.accessToken);
    setUserState(response.user);
    setStatus("authenticated");
    return response.user;
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const refreshUser = useCallback(async () => {
    const me = await usersApi.me();
    setUserState(me);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ status, user, login, logout, refreshUser, setUser: setUserState }),
    [status, user, login, logout, refreshUser],
  );

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** Test helper / storybook-like provider with a fixed state. */
export function StaticAuthProvider({ value, children }: { value: AuthContextValue; children: ReactNode }) {
  return createElement(AuthContext.Provider, { value }, children);
}

