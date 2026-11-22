"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";
import { eventsApi } from "@/lib/api";
import type { EventItem } from "@/types/api";
import { getAvailability, sortActions, isReservable } from "@/lib/events";
import { errorMessage } from "@/lib/errors";

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = Number(params.id);
  const { t, lang, formatDate, formatTime, formatPrice } = useI18n();
  const { user } = useAuth();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId || isNaN(eventId)) {
      setError("ID d'événement invalide.");
      setLoading(false);
      return;
    }
    setLoading(true);
    eventsApi
      .get(eventId)
      .then((data) => setEvent(data))
      .catch((err: unknown) => setError(errorMessage(err, lang)))
      .finally(() => setLoading(false));
  }, [eventId, lang]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50 py-5">
        <div className="spinner-border text-primary" role="status" style={{ width: "3rem", height: "3rem" }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="container py-5 text-center">
        <div className="card ef-card p-5 border-0 shadow-sm mx-auto" style={{ maxWidth: "540px" }}>
          <i className="bi bi-exclamation-triangle-fill text-danger fs-1 mb-3"></i>
          <h2 className="h4 text-dark mb-2">{error || t("errors.codes.RESOURCE_NOT_FOUND")}</h2>
          <div className="mt-4">
            <Link href="/events" className="btn btn-primary">
              <i className="bi bi-arrow-left me-1 ef-flip-rtl"></i>
              {t("events.detail.backToCatalog")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const availability = getAvailability(event);
  const canBook = isReservable(event);
  const actions = sortActions(event.actions || []);

  const handleReserveClick = () => {
    if (!user) {
      router.push(`/login?redirect=/events/${event.id}`);
      return;
    }
    router.push(`/events/${event.id}/reserve`);
  };

  return (
    <div className="container py-5">
      <div className="mb-4">
        <Link href="/events" className="btn btn-outline-secondary btn-sm mb-3">
          <i className="bi bi-arrow-left me-1 ef-flip-rtl"></i>
          {t("events.detail.backToCatalog")}
        </Link>
      </div>

      <div className="row g-4">
        {/* Main Content */}
        <div className="col-lg-8">
          <div className="card ef-card border-0 shadow-sm overflow-hidden mb-4">
            <div className="ef-image-placeholder position-relative" style={{ height: "320px" }}>
              {event.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={event.imageUrl}
                  alt={event.title}
                  className="w-100 h-100 object-fit-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              ) : (
                <i className="bi bi-calendar-event display-1 text-primary opacity-50"></i>
              )}
              <span className="position-absolute top-0 end-0 m-3 badge bg-dark bg-opacity-75 fs-6">
                {event.category}
              </span>
            </div>

            <div className="card-body p-4 p-md-5">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                {availability === "AVAILABLE" && (
                  <span className="badge ef-badge-available fs-6 px-3 py-2">
                    <i className="bi bi-check-circle me-1"></i>
                    {t("events.availability.AVAILABLE")}
                  </span>
                )}
                {availability === "ALMOST_FULL" && (
                  <span className="badge ef-badge-almost fs-6 px-3 py-2">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    {t("events.availability.ALMOST_FULL")}
                  </span>
                )}
                {availability === "FULL" && (
                  <span className="badge ef-badge-danger fs-6 px-3 py-2">
                    <i className="bi bi-x-circle me-1"></i>
                    {t("events.availability.FULL")}
                  </span>
                )}
                {availability === "CANCELED" && (
                  <span className="badge ef-badge-danger fs-6 px-3 py-2">
                    <i className="bi bi-dash-circle me-1"></i>
                    {t("events.availability.CANCELED")}
                  </span>
                )}
              </div>

              <h1 className="h2 fw-bold text-dark mb-3">{event.title}</h1>

              {event.teacher && (
                <p className="text-secondary small mb-4">
                  <i className="bi bi-person-badge me-1 text-primary"></i>
                  {t("events.organizedBy", { name: event.teacher.fullName })}
                </p>
              )}

              <hr className="my-4" />

              <h2 className="h5 fw-bold text-dark mb-3">{t("events.detail.description")}</h2>
              <div className="text-secondary mb-5" style={{ whiteSpace: "pre-line", lineHeight: 1.7 }}>
                {event.description || t("common.empty")}
              </div>

              {/* Event Program / Timeline */}
              <h2 className="h5 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-list-stars text-primary"></i>
                {t("events.detail.program")}
              </h2>

              {actions.length === 0 ? (
                <p className="text-secondary small fst-italic">{t("events.detail.noProgram")}</p>
              ) : (
                <div className="timeline ps-3 border-start border-2 border-primary border-opacity-25 mt-3">
                  {actions.map((act) => (
                    <div key={act.id} className="mb-4 position-relative ps-3">
                      <span
                        className="position-absolute bg-primary rounded-circle"
                        style={{
                          width: "12px",
                          height: "12px",
                          top: "6px",
                          left: "-7px",
                        }}
                      ></span>
                      <div className="d-flex align-items-baseline gap-2 mb-1">
                        <span className="badge bg-light text-primary border small">
                          {formatTime(act.startTime)} - {formatTime(act.endTime)}
                        </span>
                        <h3 className="h6 fw-bold text-dark mb-0">{act.title}</h3>
                      </div>
                      {act.description && (
                        <p className="text-secondary small mb-0 mt-1">{act.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Info & Booking card */}
        <div className="col-lg-4">
          <div className="card ef-card border-0 shadow-sm p-4 sticky-top" style={{ top: "90px" }}>
            <h2 className="h5 fw-bold text-dark mb-4">{t("events.detail.dateAndTime")}</h2>

            <div className="mb-3 d-flex align-items-start gap-3">
              <div className="p-2 rounded bg-light text-primary">
                <i className="bi bi-calendar-event fs-4"></i>
              </div>
              <div>
                <span className="d-block small text-secondary">{t("common.date")}</span>
                <span className="fw-semibold text-dark">{formatDate(event.eventDate)}</span>
              </div>
            </div>

            <div className="mb-3 d-flex align-items-start gap-3">
              <div className="p-2 rounded bg-light text-primary">
                <i className="bi bi-clock fs-4"></i>
              </div>
              <div>
                <span className="d-block small text-secondary">{t("teacher.startLabel")} / {t("teacher.endLabel")}</span>
                <span className="fw-semibold text-dark">
                  {formatTime(event.startTime)} — {formatTime(event.endTime)}
                </span>
              </div>
            </div>

            <div className="mb-4 d-flex align-items-start gap-3">
              <div className="p-2 rounded bg-light text-primary">
                <i className="bi bi-geo-alt fs-4"></i>
              </div>
              <div>
                <span className="d-block small text-secondary">{t("events.detail.location")}</span>
                <span className="fw-semibold text-dark">{event.location}</span>
              </div>
            </div>

            <hr />

            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-baseline mb-2">
                <span className="text-secondary small">{t("events.detail.price")}</span>
                <span className="fs-3 fw-bold text-primary">
                  {event.ticketPrice === 0 ? t("events.free") : formatPrice(event.ticketPrice)}
                </span>
              </div>

              <div className="d-flex justify-content-between text-secondary small">
                <span>{t("events.placesLeft", { count: event.availablePlaces })}</span>
                <span>{t("events.capacity", { count: event.capacity })}</span>
              </div>
            </div>

            {/* Action button */}
            {canBook ? (
              <button
                onClick={handleReserveClick}
                className="btn btn-primary w-100 py-3 fw-bold shadow-sm"
              >
                <i className="bi bi-ticket-perforated-fill me-2"></i>
                {t("events.reserveButton")}
              </button>
            ) : event.status === "ANNULE" ? (
              <button className="btn btn-secondary w-100 py-3 fw-bold" disabled>
                {t("events.reserveDisabledCanceled")}
              </button>
            ) : (
              <button className="btn btn-secondary w-100 py-3 fw-bold" disabled>
                {t("events.reserveDisabledFull")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

