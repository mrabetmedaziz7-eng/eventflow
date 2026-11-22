import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import Navbar from "@/components/layout/Navbar";
import { I18nProvider } from "@/lib/i18n";
import { StaticAuthProvider } from "@/lib/auth";
import { notificationsApi } from "@/lib/api";

vi.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/teacher/events",
  useRouter: () => ({ push: vi.fn() }),
}));

describe("Navbar teacher links", () => {
  it("renders Participants link next to Mes événements pointing to home page", async () => {
    vi.spyOn(notificationsApi, "list").mockResolvedValue([]);

    render(
      <I18nProvider initialLang="fr">
        <StaticAuthProvider
          value={{
            status: "authenticated",
            user: {
              id: 2,
              firstName: "Hajer",
              lastName: "Prof",
              email: "hajer@example.com",
              role: "ENSEIGNANT",
              status: "ACTIF",
            },
            login: vi.fn(),
            logout: vi.fn(),
            refreshUser: vi.fn(),
            setUser: vi.fn(),
          }}
        >
          <Navbar />
        </StaticAuthProvider>
      </I18nProvider>
    );

    const myEventsLink = screen.getByRole("link", { name: "Mes événements" });
    const participantsLink = screen.getByRole("link", { name: "Participants" });

    expect(myEventsLink.getAttribute("href")).toBe("/dashboard/teacher/events");
    expect(participantsLink.getAttribute("href")).toBe("/");

    const navLinks = screen.getAllByRole("link").map((el) => el.textContent?.trim());
    const myEventsIndex = navLinks.indexOf("Mes événements");
    const participantsIndex = navLinks.indexOf("Participants");
    expect(participantsIndex).toBe(myEventsIndex + 1);
  });
});
