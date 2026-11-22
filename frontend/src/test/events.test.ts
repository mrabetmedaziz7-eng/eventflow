import { describe, it, expect } from "vitest";
import {
  EVENT_CATEGORIES,
  filterEvents,
  sortEvents,
  paginate,
  getAvailability,
  almostFullThreshold,
  EMPTY_FILTERS,
} from "@/lib/events";
import { translate } from "@/lib/i18n";
import type { EventItem } from "@/types/api";

const mockEvents: EventItem[] = [
  {
    id: 1,
    title: "Workshop AI",
    description: "Deep learning workshop",
    category: "TECH",
    eventDate: "2026-11-20",
    startTime: "09:00:00",
    endTime: "12:00:00",
    location: "Labo 1",
    imageUrl: null,
    ticketPrice: 15,
    capacity: 20,
    availablePlaces: 18,
    status: "PUBLIE",
    teacher: { id: 2, fullName: "Prof Salah" },
    actions: [],
  },
  {
    id: 2,
    title: "Cultural Evening",
    description: "Music and theater",
    category: "CULTURE",
    eventDate: "2026-11-15",
    startTime: "18:00:00",
    endTime: "21:00:00",
    location: "Amphi Central",
    imageUrl: null,
    ticketPrice: 0,
    capacity: 50,
    availablePlaces: 3, // 3 <= 20% of 50 (10) -> ALMOST_FULL
    status: "PUBLIE",
    teacher: { id: 3, fullName: "Prof Amel" },
    actions: [],
  },
  {
    id: 3,
    title: "Hackathon Web",
    description: "24h hackathon",
    category: "TECH",
    eventDate: "2026-12-01",
    startTime: "08:00:00",
    endTime: "20:00:00",
    location: "Biblio",
    imageUrl: null,
    ticketPrice: 30,
    capacity: 10,
    availablePlaces: 0, // FULL
    status: "PUBLIE",
    teacher: { id: 2, fullName: "Prof Salah" },
    actions: [],
  },
];

describe("Phase 2 Events & Catalog Testing", () => {
  it("computes badges according to the 20% capacity threshold", () => {
    expect(almostFullThreshold(50)).toBe(10);
    expect(almostFullThreshold(10)).toBe(2);

    expect(getAvailability(mockEvents[0])).toBe("AVAILABLE");
    expect(getAvailability(mockEvents[1])).toBe("ALMOST_FULL");
    expect(getAvailability(mockEvents[2])).toBe("FULL");
  });

  it("filters events by search keyword and category", () => {
    const searchFilter = filterEvents(mockEvents, { ...EMPTY_FILTERS, search: "Amphi" });
    expect(searchFilter).toHaveLength(1);
    expect(searchFilter[0].id).toBe(2);

    const catFilter = filterEvents(mockEvents, { ...EMPTY_FILTERS, category: "TECH" });
    expect(catFilter).toHaveLength(2);
  });

  it("filters available places only", () => {
    const availFilter = filterEvents(mockEvents, { ...EMPTY_FILTERS, availableOnly: true });
    expect(availFilter).toHaveLength(2);
    expect(availFilter.map((e) => e.id)).toEqual([1, 2]);
  });

  it("sorts events by price ascending and descending", () => {
    const asc = sortEvents(mockEvents, "price-asc");
    expect(asc[0].ticketPrice).toBe(0);
    expect(asc[2].ticketPrice).toBe(30);

    const desc = sortEvents(mockEvents, "price-desc");
    expect(desc[0].ticketPrice).toBe(30);
    expect(desc[2].ticketPrice).toBe(0);
  });

  it("paginates events properly", () => {
    const page1 = paginate(mockEvents, 1, 2);
    expect(page1.items).toHaveLength(2);
    expect(page1.pageCount).toBe(2);
    expect(page1.total).toBe(3);

    const page2 = paginate(mockEvents, 2, 2);
    expect(page2.items).toHaveLength(1);
    expect(page2.page).toBe(2);
  });

  it("includes FOOTBALL category and updated program/nav translations", () => {
    expect(EVENT_CATEGORIES).toContain("FOOTBALL");
    expect(translate("fr", "events.categories.FOOTBALL")).toBe("Football");
    expect(translate("en", "events.categories.FOOTBALL")).toBe("Football");
    expect(translate("ar", "events.categories.FOOTBALL")).toBe("كرة القدم");
    expect(translate("fr", "teacher.addAction")).toBe("Ajouter programme");
    expect(translate("fr", "nav.participants")).toBe("Participants");
  });
});

