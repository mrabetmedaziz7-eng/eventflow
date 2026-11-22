/**
 * Pure helpers for events: availability badge, client-side filtering,
 * sorting and pagination (GET /api/events returns a plain array).
 */
import type { EventItem } from "@/types/api";

/**
 * Category values offered in the forms. The backend stores the category as free
 * text; the contract lists TECH, CULTURE, SPORT, CONFERENCE "etc.", so we add
 * ATELIER and AUTRE. Unknown values coming from the API are displayed as-is.
 */
export const EVENT_CATEGORIES = ["TECH", "CULTURE", "SPORT", "FOOTBALL", "CONFERENCE", "ATELIER", "AUTRE"] as const;

export type Availability = "AVAILABLE" | "ALMOST_FULL" | "FULL" | "CANCELED";

/** "Bientôt complet" threshold: 20 % of the capacity (rounded up, at least 1 place). */
export const ALMOST_FULL_RATIO = 0.2;

export function almostFullThreshold(capacity: number): number {
  return Math.max(1, Math.ceil(capacity * ALMOST_FULL_RATIO));
}

export function getAvailability(event: Pick<EventItem, "availablePlaces" | "capacity" | "status">): Availability {
  if (event.status === "ANNULE") return "CANCELED";
  if (event.status === "COMPLET" || event.availablePlaces <= 0) return "FULL";
  if (event.availablePlaces <= almostFullThreshold(event.capacity)) return "ALMOST_FULL";
  return "AVAILABLE";
}

export function isReservable(event: Pick<EventItem, "availablePlaces" | "capacity" | "status">): boolean {
  const availability = getAvailability(event);
  return event.status === "PUBLIE" && (availability === "AVAILABLE" || availability === "ALMOST_FULL");
}

export type EventSort = "date-asc" | "date-desc" | "price-asc" | "price-desc";

export interface EventListFilters {
  search: string;
  category: string;
  date: string;
  availableOnly: boolean;
}

export const EMPTY_FILTERS: EventListFilters = { search: "", category: "", date: "", availableOnly: false };

function normalize(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

/** Same semantics as the backend query params (search on title or place). */
export function filterEvents(events: EventItem[], filters: EventListFilters): EventItem[] {
  const query = normalize(filters.search);
  return events.filter((event) => {
    if (query && !normalize(event.title).includes(query) && !normalize(event.location).includes(query)) return false;
    if (filters.category && event.category !== filters.category) return false;
    if (filters.date && event.eventDate !== filters.date) return false;
    if (filters.availableOnly && getAvailability(event) !== "AVAILABLE" && getAvailability(event) !== "ALMOST_FULL") return false;
    return true;
  });
}

function eventTimestamp(event: EventItem): string {
  return `${event.eventDate}T${event.startTime ?? "00:00:00"}`;
}

export function sortEvents(events: EventItem[], sort: EventSort): EventItem[] {
  const copy = [...events];
  copy.sort((a, b) => {
    switch (sort) {
      case "date-desc":
        return eventTimestamp(b).localeCompare(eventTimestamp(a));
      case "price-asc":
        return Number(a.ticketPrice) - Number(b.ticketPrice) || eventTimestamp(a).localeCompare(eventTimestamp(b));
      case "price-desc":
        return Number(b.ticketPrice) - Number(a.ticketPrice) || eventTimestamp(a).localeCompare(eventTimestamp(b));
      case "date-asc":
      default:
        return eventTimestamp(a).localeCompare(eventTimestamp(b));
    }
  });
  return copy;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageCount: number;
  total: number;
}

export function paginate<T>(items: T[], page: number, pageSize: number): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(Math.max(1, page), pageCount);
  const start = (current - 1) * pageSize;
  return { items: items.slice(start, start + pageSize), page: current, pageCount, total: items.length };
}

/** Program actions in their display order. */
export function sortActions<T extends { displayOrder: number; id: number }>(actions: T[]): T[] {
  return [...actions].sort((a, b) => a.displayOrder - b.displayOrder || a.id - b.id);
}

/** "YYYY-MM-DD" of today in local time. */
export function todayIso(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

