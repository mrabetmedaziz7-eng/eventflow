"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { dashboardApi } from "@/lib/api";
import type { StudentDashboard } from "@/types/api";
import { errorMessage } from "@/lib/errors";
import RoleGuard from "@/components/common/RoleGuard";

export default function StudentDashboardPage() {
  const { t, lang, formatNumber, formatPrice, formatDate } = useI18n();

  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .student()
      .then((data) => setDashboard(data))
      .catch((err: unknown) => setError(errorMessage(err, lang)))
      .finally(() => setLoading(false));
  }, [lang]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50 py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["ETUDIANT"]}>
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 fw-bold text-dark mb-1">{t("student.dashboardTitle")}</h1>
            <p className="text-secondary small mb-0">{t("student.dashboardSubtitle")}</p>
          </div>
          <Link href="/dashboard/student/reservations" className="btn btn-outline-primary btn-sm">
            <i className="bi bi-ticket-perforated me-1"></i>
            {t("student.myReservationsTitle")}
          </Link>
        </div>

        {error && (
          <div className="alert alert-danger py-2 small mb-4">
            <i className="bi bi-x-circle-fill me-1"></i>
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="row g-3 mb-5">
          <div className="col-12 col-sm-4">
            <div className="card ef-card p-4 border-0 shadow-sm h-100">
              <span className="text-secondary small d-block mb-1">{t("student.kpiReservations")}</span>
              <span className="fs-3 fw-bold text-primary">
                {formatNumber(dashboard?.confirmedReservationCount)}
              </span>
            </div>
          </div>
          <div className="col-12 col-sm-4">
            <div className="card ef-card p-4 border-0 shadow-sm h-100">
              <span className="text-secondary small d-block mb-1">{t("student.kpiPayments")}</span>
              <span className="fs-3 fw-bold text-success">{formatNumber(dashboard?.paymentCount)}</span>
            </div>
          </div>
          <div className="col-12 col-sm-4">
            <div className="card ef-card p-4 border-0 shadow-sm h-100">
              <span className="text-secondary small d-block mb-1">{t("student.kpiSpent")}</span>
              <span className="fs-3 fw-bold text-dark">{formatPrice(dashboard?.paidAmount)}</span>
            </div>
          </div>
        </div>

        {/* Upcoming Events */}
        <div className="card ef-card border-0 shadow-sm overflow-hidden mb-5">
          <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
            <h2 className="h5 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-calendar-event text-primary"></i>
              {t("student.upcomingTitle")}
            </h2>
            <Link href="/events" className="btn btn-outline-primary btn-sm">
              {t("home.exploreButton")}
            </Link>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr className="small text-secondary">
                  <th>{t("ticket.eventLabel")}</th>
                  <th>{t("ticket.dateLabel")}</th>
                  <th>{t("events.detail.location")}</th>
                  <th>{t("reservation.placesLabel")}</th>
                  <th>{t("ticket.codeLabel")}</th>
                  <th className="text-end">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {!dashboard?.upcomingEvents || dashboard.upcomingEvents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-secondary small">
                      {t("student.noUpcoming")}
                    </td>
                  </tr>
                ) : (
                  dashboard.upcomingEvents.map((evt) => (
                    <tr key={evt.reservationId}>
                      <td className="fw-semibold text-dark">{evt.eventTitle}</td>
                      <td className="small text-secondary">{formatDate(evt.eventDate, "short")}</td>
                      <td className="small text-secondary">{evt.location}</td>
                      <td className="small">{t("teacher.placesCount", { count: evt.numberOfPlaces })}</td>
                      <td className="small font-monospace text-primary">{evt.confirmationCode}</td>
                      <td className="text-end">
                        <Link
                          href={`/reservations/${evt.reservationId}/ticket`}
                          className="btn btn-outline-primary btn-sm"
                        >
                          <i className="bi bi-ticket-perforated me-1"></i>
                          {t("reservation.viewTicket")}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Past Events */}
        {dashboard?.pastEvents && dashboard.pastEvents.length > 0 && (
          <div className="card ef-card border-0 shadow-sm overflow-hidden">
            <div className="card-header bg-white border-bottom py-3">
              <h2 className="h5 fw-bold text-dark mb-0">{t("student.pastTitle")}</h2>
            </div>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-secondary">
                    <th>{t("ticket.eventLabel")}</th>
                    <th>{t("ticket.dateLabel")}</th>
                    <th>{t("reservation.placesLabel")}</th>
                    <th>{t("ticket.amountLabel")}</th>
                  </tr>
                </thead>
                <tbody>
                  {dashboard.pastEvents.map((evt) => (
                    <tr key={evt.reservationId}>
                      <td className="fw-semibold text-dark">{evt.eventTitle}</td>
                      <td className="small text-secondary">{formatDate(evt.eventDate, "short")}</td>
                      <td className="small">{t("teacher.placesCount", { count: evt.numberOfPlaces })}</td>
                      <td className="small fw-semibold">{formatPrice(evt.amount)}</td>
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

