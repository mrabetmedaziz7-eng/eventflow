"use client";

import Link from "next/link";
import { useState } from "react";
import type { EventItem } from "@/types/api";
import { useI18n } from "@/lib/i18n";
import { getAvailability } from "@/lib/events";

interface EventCardProps {
  event: EventItem;
}

export default function EventCard({ event }: EventCardProps) {
  const { t, formatDate, formatPrice } = useI18n();
  const [imageError, setImageError] = useState(false);
  const availability = getAvailability(event);

  return (
    <div className="card h-100 ef-card ef-card-interactive border-0 overflow-hidden shadow-sm d-flex flex-column">
      <div className="ef-image-placeholder position-relative" style={{ height: "180px" }}>
        {event.imageUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.imageUrl}
            alt={event.title}
            className="w-100 h-100 object-fit-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="d-flex flex-column align-items-center justify-content-center text-primary opacity-50">
            <i className="bi bi-calendar-event display-4"></i>
          </div>
        )}
        <span className="position-absolute top-0 end-0 m-2 badge bg-dark bg-opacity-75">
          {event.category}
        </span>
      </div>

      <div className="card-body p-4 d-flex flex-column flex-grow-1">
        <div className="mb-2">
          {availability === "AVAILABLE" && (
            <span className="badge ef-badge-available">{t("events.availability.AVAILABLE")}</span>
          )}
          {availability === "ALMOST_FULL" && (
            <span className="badge ef-badge-almost">{t("events.availability.ALMOST_FULL")}</span>
          )}
          {availability === "FULL" && (
            <span className="badge ef-badge-danger">{t("events.availability.FULL")}</span>
          )}
          {availability === "CANCELED" && (
            <span className="badge ef-badge-danger">{t("events.availability.CANCELED")}</span>
          )}
        </div>

        <h3 className="h5 fw-bold text-dark card-title mb-2 text-truncate" title={event.title}>
          {event.title}
        </h3>

        <p className="text-secondary small mb-3 flex-grow-1">
          {event.description ? event.description.slice(0, 110) + (event.description.length > 110 ? "..." : "") : ""}
        </p>

        <div className="text-secondary small mb-3">
          <div className="mb-1">
            <i className="bi bi-calendar3 me-1 text-primary"></i>
            {formatDate(event.eventDate, "short")}
          </div>
          <div className="mb-1 text-truncate">
            <i className="bi bi-geo-alt me-1 text-primary"></i>
            {event.location}
          </div>
          <div>
            <i className="bi bi-people me-1 text-primary"></i>
            {t("events.placesLeft", { count: event.availablePlaces })}
          </div>
        </div>

        <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-auto">
          <span className="fw-bold fs-5 text-primary">
            {event.ticketPrice === 0 ? t("events.free") : formatPrice(event.ticketPrice)}
          </span>
          <Link href={`/events/${event.id}`} className="btn btn-outline-primary btn-sm px-3">
            {t("events.viewDetail")}
          </Link>
        </div>
      </div>
    </div>
  );
}

