import { afterEach, describe, expect, it, vi } from "vitest";
import { buildUrl, resolveApiBaseUrl } from "@/lib/api";

describe("API URL resolution", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("keeps default localhost:2525 when NEXT_PUBLIC_API_URL is undefined", () => {
    expect(resolveApiBaseUrl(undefined)).toBe("http://localhost:2525");
    expect(buildUrl("/api/events", { search: "IA" }, "http://localhost:2525")).toBe(
      "http://localhost:2525/api/events?search=IA"
    );
  });

  it("preserves explicit absolute URLs without trailing slash", () => {
    expect(resolveApiBaseUrl("https://api.example.com/")).toBe("https://api.example.com");
    expect(buildUrl("/api/events", { availableOnly: true }, "https://api.example.com")).toBe(
      "https://api.example.com/api/events?availableOnly=true"
    );
  });

  it("supports empty string, root slash, and /api relative URLs without duplicating /api", () => {
    expect(resolveApiBaseUrl("")).toBe("");
    expect(resolveApiBaseUrl("/")).toBe("");
    expect(resolveApiBaseUrl("/api")).toBe("/api");

    expect(buildUrl("/api/events", { search: "IA", category: undefined }, "")).toBe("/api/events?search=IA");
    expect(buildUrl("/api/events", { category: "TECH" }, "/api")).toBe("/api/events?category=TECH");
    expect(buildUrl("/events", { category: "TECH" }, "/api")).toBe("/api/events?category=TECH");
  });

  it("dispatches fetch with a relative path when NEXT_PUBLIC_API_URL is empty or /api", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_URL", "");
    vi.resetModules();
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(new Response(JSON.stringify([]), { status: 200 })));
    vi.stubGlobal("fetch", fetchMock);

    const apiEmpty = await import("@/lib/api");
    expect(apiEmpty.API_BASE_URL).toBe("");
    await apiEmpty.eventsApi.list({ search: "DevOps" });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/events?search=DevOps",
      expect.objectContaining({ method: "GET" })
    );

    vi.stubEnv("NEXT_PUBLIC_API_URL", "/api");
    vi.resetModules();
    const apiPrefix = await import("@/lib/api");
    expect(apiPrefix.API_BASE_URL).toBe("/api");
    await apiPrefix.eventsApi.list({ category: "TECH" });
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/events?category=TECH",
      expect.objectContaining({ method: "GET" })
    );
  });
});
