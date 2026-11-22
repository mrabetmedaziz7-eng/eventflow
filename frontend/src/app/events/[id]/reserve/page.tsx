"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { eventsApi, reservationsApi } from "@/lib/api";
import type { EventItem, PaymentMethod } from "@/types/api";
import { validatePlaces } from "@/lib/validation";
import { isReservable } from "@/lib/events";
import { errorMessage } from "@/lib/errors";
import RoleGuard from "@/components/common/RoleGuard";

export default function ReserveEventPage() {
  const params = useParams();
  const eventId = Number(params.id);
  const router = useRouter();
  const { t, lang, formatDate, formatTime, formatPrice } = useI18n();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [numberOfPlaces, setNumberOfPlaces] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CARTE_SIMULEE");
  const [placesError, setPlacesError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!eventId || isNaN(eventId)) {
      setError("ID invalide.");
      setLoading(false);
      return;
    }
    setLoading(true);
    eventsApi
      .get(eventId)
      .then((data) => {
        setEvent(data);
        if (!isReservable(data)) {
          setError(t("errors.codes.INSUFFICIENT_CAPACITY"));
        }
      })
      .catch((err: unknown) => setError(errorMessage(err, lang)))
      .finally(() => setLoading(false));
  }, [eventId, lang, t]);

  const handleConfirmReservation = async () => {
    if (!event) return;
    const err = validatePlaces(numberOfPlaces, event.availablePlaces);
    if (err) {
      setPlacesError(err);
      return;
    }
    setPlacesError(null);
    setSubmitting(true);
    setError(null);

    try {
      const res = await reservationsApi.create({
        eventId: event.id,
        numberOfPlaces,
        paymentMethod,
      });

      // Free event => confirmed directly
      if (res.status === "CONFIRMEE") {
        router.push(`/reservations/${res.id}/ticket?new=1`);
      } else {
        // Paid event => proceed to payment simulation
        router.push(`/reservations/${res.id}/pay`);
      }
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50 py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!event || error) {
    return (
      <div className="container py-5 text-center">
        <div className="card ef-card p-5 border-0 shadow-sm mx-auto" style={{ maxWidth: "520px" }}>
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

  const isFree = event.ticketPrice === 0;
  const totalPrice = numberOfPlaces * event.ticketPrice;

  return (
    <RoleGuard allowedRoles={["ETUDIANT"]}>
      <div className="container py-5" style={{ maxWidth: "680px" }}>
        <div className="mb-4">
          <Link href={`/events/${event.id}`} className="btn btn-outline-secondary btn-sm mb-3">
            <i className="bi bi-arrow-left me-1 ef-flip-rtl"></i>
            {t("events.detail.backToCatalog")}
          </Link>
          <h1 className="h3 fw-bold text-dark mb-1">
            {t("reservation.modalTitle", { title: event.title })}
          </h1>
        </div>

        <div className="card ef-card p-4 p-md-5 border-0 shadow-sm">
          <h2 className="h5 fw-bold text-dark mb-3 border-bottom pb-2">
            {t("reservation.summary")}
          </h2>

          <div className="bg-light p-3 rounded-3 mb-4">
            <div className="row g-2 small text-secondary">
              <div className="col-sm-6">
                <span className="fw-semibold text-dark">{t("reservation.eventDate")}</span>{" "}
                {formatDate(event.eventDate)} ({formatTime(event.startTime)} - {formatTime(event.endTime)})
              </div>
              <div className="col-sm-6">
                <span className="fw-semibold text-dark">{t("reservation.eventLocation")}</span>{" "}
                {event.location}
              </div>
              <div className="col-sm-6">
                <span className="fw-semibold text-dark">{t("reservation.unitPrice")}</span>{" "}
                {isFree ? t("events.free") : formatPrice(event.ticketPrice)}
              </div>
              <div className="col-sm-6">
                <span className="fw-semibold text-dark">{t("events.placesLeft", { count: event.availablePlaces })}</span>
              </div>
            </div>
          </div>

          {/* Booking Inputs */}
          <div className="mb-4">
            <label htmlFor="places" className="form-label small fw-semibold text-dark">
              {t("reservation.placesLabel")} <span className="text-danger">*</span>
            </label>
            <input
              id="places"
              type="number"
              min={1}
              max={event.availablePlaces}
              className={`form-control ${placesError ? "is-invalid" : ""}`}
              value={numberOfPlaces}
              onChange={(e) => {
                const val = parseInt(e.target.value) || 1;
                setNumberOfPlaces(val);
              }}
              disabled={submitting}
            />
            {placesError && <div className="invalid-feedback small">{t(placesError)}</div>}
          </div>

          {!isFree && (
            <div className="mb-4">
              <label className="form-label small fw-semibold text-dark mb-2">
                {t("reservation.paymentMethod")} <span className="text-danger">*</span>
              </label>
              <div className="d-flex flex-column gap-2">
                <div className="form-check p-3 border rounded-3 bg-white">
                  <input
                    id="methodCard"
                    type="radio"
                    name="paymentMethod"
                    className="form-check-input"
                    checked={paymentMethod === "CARTE_SIMULEE"}
                    onChange={() => setPaymentMethod("CARTE_SIMULEE")}
                  />
                  <label htmlFor="methodCard" className="form-check-label fw-semibold text-dark d-flex align-items-center gap-2">
                    <i className="bi bi-credit-card-2-front text-primary"></i>
                    {t("reservation.methodCard")}
                  </label>
                </div>
                <div className="form-check p-3 border rounded-3 bg-white">
                  <input
                    id="methodTransfer"
                    type="radio"
                    name="paymentMethod"
                    className="form-check-input"
                    checked={paymentMethod === "VIREMENT_SIMULE"}
                    onChange={() => setPaymentMethod("VIREMENT_SIMULE")}
                  />
                  <label htmlFor="methodTransfer" className="form-check-label fw-semibold text-dark d-flex align-items-center gap-2">
                    <i className="bi bi-bank text-primary"></i>
                    {t("reservation.methodTransfer")}
                  </label>
                </div>
              </div>
            </div>
          )}

          {isFree && (
            <div className="alert alert-info py-2 small mb-4">
              <i className="bi bi-info-circle-fill me-1"></i>
              {t("reservation.freeNotice")}
            </div>
          )}

          {/* Total Calculation */}
          <div className="d-flex justify-content-between align-items-baseline p-3 bg-primary bg-opacity-10 rounded-3 mb-4">
            <span className="fw-semibold text-dark">{t("reservation.totalPrice")}</span>
            <span className="fs-4 fw-bold text-primary">
              {isFree ? t("events.free") : formatPrice(totalPrice)}
            </span>
          </div>

          <button
            onClick={handleConfirmReservation}
            className="btn btn-primary w-100 py-3 fw-bold shadow-sm"
            disabled={submitting}
          >
            {submitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                {t("reservation.confirming")}
              </>
            ) : (
              t("reservation.confirmButton")
            )}
          </button>
        </div>
      </div>
    </RoleGuard>
  );
}
