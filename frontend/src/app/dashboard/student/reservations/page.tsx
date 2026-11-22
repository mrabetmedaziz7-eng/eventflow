"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { reservationsApi } from "@/lib/api";
import type { Reservation } from "@/types/api";
import { errorMessage } from "@/lib/errors";
import RoleGuard from "@/components/common/RoleGuard";

export default function StudentReservationsPage() {
  const { t, lang, formatDateTime, formatPrice } = useI18n();

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cancelingId, setCancelingId] = useState<number | null>(null);

  const fetchReservations = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reservationsApi.mine();
      setReservations(data);
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
  }, []);

  const handleCancelReservation = async (id: number) => {
    if (!confirm(t("reservation.cancelConfirm"))) return;
    setCancelingId(id);
    setError(null);
    try {
      await reservationsApi.cancel(id);
      setSuccessMessage(t("reservation.canceledSuccess"));
      await fetchReservations();
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setCancelingId(null);
    }
  };

  return (
    <RoleGuard allowedRoles={["ETUDIANT"]}>
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 fw-bold text-dark mb-1">{t("student.myReservationsTitle")}</h1>
            <p className="text-secondary small mb-0">{t("student.dashboardSubtitle")}</p>
          </div>
          <Link href="/events" className="btn btn-outline-primary btn-sm">
            <i className="bi bi-search me-1"></i>
            {t("home.exploreButton")}
          </Link>
        </div>

        {successMessage && (
          <div className="alert alert-success alert-dismissible fade show py-2 small mb-4" role="alert">
            <i className="bi bi-check-circle-fill me-1"></i>
            {successMessage}
            <button type="button" className="btn-close py-2" onClick={() => setSuccessMessage(null)}></button>
          </div>
        )}

        {error && (
          <div className="alert alert-danger py-2 small mb-4" role="alert">
            <i className="bi bi-x-circle-fill me-1"></i>
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : reservations.length === 0 ? (
          <div className="card ef-card p-5 text-center text-secondary border-0 shadow-sm">
            <i className="bi bi-ticket-perforated fs-1 text-primary opacity-50 mb-3"></i>
            <h2 className="h5 text-dark mb-2">{t("student.noReservations")}</h2>
            <div className="mt-3">
              <Link href="/events" className="btn btn-primary btn-sm">
                {t("home.exploreButton")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="card ef-card border-0 shadow-sm overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-secondary">
                    <th>{t("ticket.eventLabel")}</th>
                    <th>{t("reservation.placesLabel")}</th>
                    <th>{t("ticket.amountLabel")}</th>
                    <th>{t("common.status")}</th>
                    <th>{t("common.date")}</th>
                    <th className="text-end">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id}>
                      <td>
                        <Link href={`/events/${r.eventId}`} className="fw-semibold text-dark text-decoration-none">
                          {r.eventTitle}
                        </Link>
                        {r.confirmationCode && (
                          <div className="small text-primary font-monospace">{r.confirmationCode}</div>
                        )}
                      </td>
                      <td className="small">{t("teacher.placesCount", { count: r.numberOfPlaces })}</td>
                      <td className="fw-semibold text-dark small">
                        {r.amount === 0 ? t("events.free") : formatPrice(r.amount)}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            r.status === "CONFIRMEE"
                              ? "ef-badge-available"
                              : r.status === "EN_ATTENTE"
                              ? "ef-badge-pending"
                              : "ef-badge-danger"
                          }`}
                        >
                          {r.status}
                        </span>
                      </td>
                      <td className="small text-secondary">{formatDateTime(r.reservationDate)}</td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          {r.status === "CONFIRMEE" && (
                            <Link
                              href={`/reservations/${r.id}/ticket`}
                              className="btn btn-outline-primary"
                              title={t("reservation.viewTicket")}
                            >
                              <i className="bi bi-ticket-perforated"></i>
                            </Link>
                          )}
                          {r.status === "EN_ATTENTE" && (
                            <Link
                              href={`/reservations/${r.id}/pay`}
                              className="btn btn-success"
                              title="Payer"
                            >
                              <i className="bi bi-credit-card"></i>
                            </Link>
                          )}
                          {(r.status === "CONFIRMEE" || r.status === "EN_ATTENTE") && (
                            <button
                              onClick={() => handleCancelReservation(r.id)}
                              className="btn btn-outline-danger"
                              disabled={cancelingId === r.id}
                              title={t("reservation.cancelButton")}
                            >
                              <i className="bi bi-x-circle"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

