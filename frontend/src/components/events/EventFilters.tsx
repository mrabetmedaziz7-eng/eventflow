"use client";

import { useI18n } from "@/lib/i18n";
import { EVENT_CATEGORIES, type EventListFilters, type EventSort } from "@/lib/events";

interface EventFiltersProps {
  filters: EventListFilters;
  onChangeFilters: (filters: EventListFilters) => void;
  sort: EventSort;
  onChangeSort: (sort: EventSort) => void;
  onReset: () => void;
}

export default function EventFilters({
  filters,
  onChangeFilters,
  sort,
  onChangeSort,
  onReset,
}: EventFiltersProps) {
  const { t } = useI18n();

  return (
    <div className="card ef-card p-4 border-0 shadow-sm mb-4">
      <div className="row g-3 align-items-end">
        {/* Search */}
        <div className="col-12 col-md-4">
          <label htmlFor="search" className="form-label small fw-semibold text-dark">
            <i className="bi bi-search me-1 text-primary"></i>
            {t("events.searchPlaceholder")}
          </label>
          <input
            id="search"
            type="search"
            className="form-control"
            placeholder={t("events.searchPlaceholder")}
            value={filters.search}
            onChange={(e) => onChangeFilters({ ...filters, search: e.target.value })}
          />
        </div>

        {/* Category */}
        <div className="col-6 col-md-2">
          <label htmlFor="category" className="form-label small fw-semibold text-dark">
            {t("teacher.categoryLabel")}
          </label>
          <select
            id="category"
            className="form-select"
            value={filters.category}
            onChange={(e) => onChangeFilters({ ...filters, category: e.target.value })}
          >
            <option value="">{t("events.allCategories")}</option>
            {EVENT_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {t(`events.categories.${cat}`) !== `events.categories.${cat}`
                  ? t(`events.categories.${cat}`)
                  : cat}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="col-6 col-md-2">
          <label htmlFor="date" className="form-label small fw-semibold text-dark">
            {t("common.date")}
          </label>
          <input
            id="date"
            type="date"
            className="form-control"
            value={filters.date}
            onChange={(e) => onChangeFilters({ ...filters, date: e.target.value })}
          />
        </div>

        {/* Sort */}
        <div className="col-6 col-md-2">
          <label htmlFor="sortBy" className="form-label small fw-semibold text-dark">
            {t("events.sortBy")}
          </label>
          <select
            id="sortBy"
            className="form-select"
            value={sort}
            onChange={(e) => onChangeSort(e.target.value as EventSort)}
          >
            <option value="date-asc">{t("events.sortDateAsc")}</option>
            <option value="date-desc">{t("events.sortDateDesc")}</option>
            <option value="price-asc">{t("events.sortPriceAsc")}</option>
            <option value="price-desc">{t("events.sortPriceDesc")}</option>
          </select>
        </div>

        {/* Available Only & Reset */}
        <div className="col-6 col-md-2 d-flex flex-column justify-content-end gap-2">
          <div className="form-check mb-1">
            <input
              id="availableOnly"
              type="checkbox"
              className="form-check-input"
              checked={filters.availableOnly}
              onChange={(e) => onChangeFilters({ ...filters, availableOnly: e.target.checked })}
            />
            <label htmlFor="availableOnly" className="form-check-label small fw-semibold text-dark">
              {t("events.availableOnly")}
            </label>
          </div>
          <button onClick={onReset} className="btn btn-outline-secondary btn-sm w-100">
            <i className="bi bi-x-circle me-1"></i>
            {t("events.resetFilters")}
          </button>
        </div>
      </div>
    </div>
  );
}

