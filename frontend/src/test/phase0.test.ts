import { describe, it, expect } from "vitest";
import { translate, dirFor } from "@/lib/i18n";
import { getAvailability, almostFullThreshold } from "@/lib/events";

describe("Phase 0 setup test suite", () => {
  it("translates brand keys across languages", () => {
    expect(translate("fr", "brand.name")).toBe("EventFlow");
    expect(translate("en", "brand.name")).toBe("EventFlow");
    expect(translate("ar", "brand.name")).toBe("إيفنت فلو");
  });

  it("determines text direction", () => {
    expect(dirFor("fr")).toBe("ltr");
    expect(dirFor("en")).toBe("ltr");
    expect(dirFor("ar")).toBe("rtl");
  });

  it("calculates availability correctly", () => {
    expect(almostFullThreshold(50)).toBe(10);
    expect(almostFullThreshold(10)).toBe(2);

    expect(getAvailability({ capacity: 50, availablePlaces: 40, status: "PUBLIE" })).toBe("AVAILABLE");
    expect(getAvailability({ capacity: 50, availablePlaces: 5, status: "PUBLIE" })).toBe("ALMOST_FULL");
    expect(getAvailability({ capacity: 50, availablePlaces: 0, status: "PUBLIE" })).toBe("FULL");
    expect(getAvailability({ capacity: 50, availablePlaces: 10, status: "ANNULE" })).toBe("CANCELED");
  });
});

