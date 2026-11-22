"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { eventsApi } from "@/lib/api";
import type { EventItem } from "@/types/api";
import EventCard from "@/components/events/EventCard";
import EventFilters from "@/components/events/EventFilters";
import {
  filterEvents,
  sortEvents,
  paginate,
  EMPTY_FILTERS,
  type EventListFilters,
  type EventSort,
} from "@/lib/events";
import { errorMessage } from "@/lib/errors";

const PAGE_SIZE = 6;

export default function EventsCatalogPage() {
  const { t, lang } = useI18n();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState<EventListFilters>(EMPTY_FILTERS);
  const [sort, setSort] = useState<EventSort>("date-asc");
  const [page, setPage] = useState(1);

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await eventsApi.list();
      setEvents(data);
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleResetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setSort("date-asc");
    setPage(1);
  };

  const filtered = filterEvents(events, filters);
  const sorted = sortEvents(filtered, sort);
  const paged = paginate(sorted, page, PAGE_SIZE);

  return (
    <div className="container py-5">
      <div className="mb-4">
        <h1 className="h2 fw-bold text-dark mb-1">{t("events.catalogTitle")}</h1>
        <p className="text-secondary">{t("events.catalogSubtitle")}</p>
      </div>

      <EventFilters
        filters={filters}
        onChangeFilters={(f) => {
          setFilters(f);
          setPage(1);
        }}
        sort={sort}
        onChangeSort={(s) => setSort(s)}
        onReset={handleResetFilters}
      />

      {error && (
        <div className="alert alert-danger py-3 mb-4 shadow-sm" role="alert">
          <div className="d-flex justify-content-between align-items-center">
            <span>
              <i className="bi bi-exclamation-triangle-fill me-2"></i>
              {error}
            </span>
            <button onClick={fetchEvents} className="btn btn-outline-danger btn-sm">
              {t("common.retry")}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      ) : sorted.length === 0 ? (
        <div className="card ef-card p-5 text-center text-secondary border-0 shadow-sm">
          <i className="bi bi-calendar-x fs-1 text-primary opacity-50 mb-3"></i>
          <h2 className="h4 text-dark mb-2">{t("events.noResults")}</h2>
          <p className="mb-3">{t("events.catalogSubtitle")}</p>
          <div>
            <button onClick={handleResetFilters} className="btn btn-primary btn-sm px-3">
              {t("events.resetFilters")}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="d-flex justify-content-between align-items-center mb-3 text-secondary small">
            <span>{t("events.resultsCount", { count: sorted.length })}</span>
            <span>{t("common.page", { current: paged.page, total: paged.pageCount })}</span>
          </div>

          <div className="row g-4 mb-4">
            {paged.items.map((event) => (
              <div key={event.id} className="col-12 col-md-6 col-lg-4">
                <EventCard event={event} />
              </div>
            ))}
          </div>

          {/* Pagination Controls */}
          {paged.pageCount > 1 && (
            <div className="d-flex justify-content-center gap-2 mt-4">
              <button
                className="btn btn-outline-primary btn-sm px-3"
                disabled={paged.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <i className="bi bi-chevron-left me-1 ef-flip-rtl"></i>
                {t("common.previous")}
              </button>
              <div className="d-flex align-items-center px-3 small fw-semibold text-secondary">
                {paged.page} / {paged.pageCount}
              </div>
              <button
                className="btn btn-outline-primary btn-sm px-3"
                disabled={paged.page >= paged.pageCount}
                onClick={() => setPage((p) => Math.min(paged.pageCount, p + 1))}
              >
                {t("common.next")}
                <i className="bi bi-chevron-right ms-1 ef-flip-rtl"></i>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

