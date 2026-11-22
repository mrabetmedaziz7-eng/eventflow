import { describe, it, expect } from "vitest";
import { dashboardPathFor } from "@/lib/auth";
import type { Role } from "@/types/api";

describe("Role and Route Guards", () => {
  it("redirects users to their respective dashboards based on role", () => {
    expect(dashboardPathFor("ADMIN" as Role)).toBe("/dashboard/admin");
    expect(dashboardPathFor("ENSEIGNANT" as Role)).toBe("/dashboard/teacher");
    expect(dashboardPathFor("ETUDIANT" as Role)).toBe("/dashboard/student");
  });
});

