"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { reservationsApi } from "@/lib/api";
import type { Ticket } from "@/types/api";
import { errorMessage } from "@/lib/errors";
import RoleGuard from "@/components/common/RoleGuard";

export default function TicketPage() {
  const params = useParams();
  const reservationId = Number(params.id);
  const { t, lang, formatDate, formatDateTime, formatPrice } = useI18n();

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reservationId || isNaN(reservationId)) {
      setError("ID invalide.");
      setLoading(false);
      return;
    }
    setLoading(true);
    reservationsApi
      .ticket(reservationId)
      .then((data) => setTicket(data))
      .catch((err: unknown) => setError(errorMessage(err, lang)))
      .finally(() => setLoading(false));
  }, [reservationId, lang]);

  const handlePrint = () => {
    window.print();
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

  if (error || !ticket) {
    return (
      <div className="container py-5 text-center">
        <div className="card ef-card p-5 border-0 shadow-sm mx-auto" style={{ maxWidth: "520px" }}>
          <i className="bi bi-exclamation-triangle-fill text-danger fs-1 mb-3"></i>
          <h2 className="h4 text-dark mb-2">{error || t("errors.codes.RESOURCE_NOT_FOUND")}</h2>
          <div className="mt-4">
            <Link href="/dashboard/student/reservations" className="btn btn-primary">
              <i className="bi bi-arrow-left me-1 ef-flip-rtl"></i>
              {t("ticket.backToReservations")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["ETUDIANT"]}>
      <div className="container py-5" style={{ maxWidth: "720px" }}>
        {/* Navigation & Print Action Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 ef-no-print">
          <Link href="/dashboard/student/reservations" className="btn btn-outline-secondary btn-sm">
            <i className="bi bi-arrow-left me-1 ef-flip-rtl"></i>
            {t("ticket.backToReservations")}
          </Link>
          <button onClick={handlePrint} className="btn btn-primary btn-sm px-3">
            <i className="bi bi-printer-fill me-2"></i>
            {t("ticket.printButton")}
          </button>
        </div>

        {/* Printable Ticket Voucher */}
        <div className="card ef-card ef-printable p-4 p-md-5 border-0 shadow position-relative overflow-hidden">
          <div className="border-bottom pb-4 mb-4 d-flex justify-content-between align-items-start">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <i className="bi bi-calendar2-event-fill text-primary fs-3"></i>
                <h1 className="h4 fw-bold text-dark mb-0">EventFlow</h1>
              </div>
              <p className="text-secondary small mb-0">Institut Supérieur des Études Technologiques de Nabeul</p>
            </div>
            <div className="text-end">
              <span className="badge bg-success bg-opacity-10 text-success border border-success border-opacity-25 px-3 py-2 fs-6">
                <i className="bi bi-check2-circle me-1"></i>
                CONFIRMÉ
              </span>
            </div>
          </div>

          <div className="text-center my-3 py-3 bg-light rounded-3">
            <span className="d-block text-secondary small fw-semibold text-uppercase tracking-wider">
              {t("ticket.codeLabel")}
            </span>
            <span className="display-6 fw-bold text-primary font-monospace">
              {ticket.reservationCode}
            </span>
          </div>

          <div className="row g-3 py-3">
            <div className="col-12">
              <span className="text-secondary small d-block">{t("ticket.eventLabel")}</span>
              <h2 className="h5 fw-bold text-dark mb-0">{ticket.eventTitle}</h2>
            </div>
            <div className="col-sm-6">
              <span className="text-secondary small d-block">{t("ticket.dateLabel")}</span>
              <span className="fw-semibold text-dark">{formatDate(ticket.eventDate)}</span>
            </div>
            <div className="col-sm-6">
              <span className="text-secondary small d-block">{t("ticket.locationLabel")}</span>
              <span className="fw-semibold text-dark">{ticket.location}</span>
            </div>
            <div className="col-sm-6">
              <span className="text-secondary small d-block">{t("ticket.studentLabel")}</span>
              <span className="fw-semibold text-dark">{ticket.studentName}</span>
            </div>
            <div className="col-sm-6">
              <span className="text-secondary small d-block">{t("ticket.amountLabel")}</span>
              <span className="fw-bold text-primary">
                {ticket.amount === 0 ? t("events.free") : formatPrice(ticket.amount)}
              </span>
            </div>
            <div className="col-sm-6">
              <span className="text-secondary small d-block">{t("ticket.methodLabel")}</span>
              <span className="text-dark small">
                {ticket.paymentMethod === "GRATUIT" ? t("events.free") : ticket.paymentMethod}
              </span>
            </div>
            <div className="col-sm-6">
              <span className="text-secondary small d-block">{t("ticket.referenceLabel")}</span>
              <span className="text-dark font-monospace small">{ticket.paymentReference}</span>
            </div>
            <div className="col-sm-6">
              <span className="text-secondary small d-block">{t("ticket.paymentDateLabel")}</span>
              <span className="text-secondary small">{formatDateTime(ticket.paymentDate)}</span>
            </div>
            <div className="col-sm-6">
              <span className="text-secondary small d-block">{t("ticket.generatedAtLabel")}</span>
              <span className="text-secondary small">{formatDateTime(ticket.generatedAt)}</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-top text-center text-secondary small">
            <p className="mb-0 fst-italic">{t("ticket.notice")}</p>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

