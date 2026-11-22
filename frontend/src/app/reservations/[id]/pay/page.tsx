"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/lib/i18n";
import { reservationsApi } from "@/lib/api";
import { errorMessage } from "@/lib/errors";
import RoleGuard from "@/components/common/RoleGuard";

export default function SimulatedPaymentPage() {
  const params = useParams();
  const reservationId = Number(params.id);
  const { t, lang } = useI18n();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<"SUCCESS" | "FAILED" | null>(null);

  const handlePay = async (status: "PAYE" | "ECHOUE") => {
    setLoading(true);
    setError(null);
    try {
      const res = await reservationsApi.pay(reservationId, status);
      if (res.paymentStatus === "PAYE") {
        setResult("SUCCESS");
      } else {
        setResult("FAILED");
      }
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["ETUDIANT"]}>
      <div className="container py-5 my-auto" style={{ maxWidth: "560px" }}>
        {result === "SUCCESS" ? (
          <div className="card ef-card p-5 border-0 shadow-sm text-center">
            <div className="d-inline-flex p-3 rounded-circle bg-success bg-opacity-10 text-success mx-auto mb-3">
              <i className="bi bi-patch-check-fill display-4"></i>
            </div>
            <h1 className="h4 fw-bold text-dark mb-2">{t("reservation.successTitle")}</h1>
            <p className="text-secondary small mb-4">{t("reservation.successMessage")}</p>
            <div className="d-flex flex-column gap-2">
              <Link href={`/reservations/${reservationId}/ticket`} className="btn btn-primary py-2 fw-semibold">
                <i className="bi bi-ticket-perforated me-1"></i>
                {t("reservation.viewTicket")}
              </Link>
              <Link href="/dashboard/student/reservations" className="btn btn-outline-secondary py-2">
                {t("reservation.goToMyReservations")}
              </Link>
            </div>
          </div>
        ) : result === "FAILED" ? (
          <div className="card ef-card p-5 border-0 shadow-sm text-center">
            <div className="d-inline-flex p-3 rounded-circle bg-danger bg-opacity-10 text-danger mx-auto mb-3">
              <i className="bi bi-x-circle-fill display-4"></i>
            </div>
            <h1 className="h4 fw-bold text-danger mb-2">{t("reservation.failedTitle")}</h1>
            <p className="text-secondary small mb-4">{t("reservation.failedMessage")}</p>
            <div className="d-flex flex-column gap-2">
              <Link href="/events" className="btn btn-outline-primary py-2">
                {t("events.catalogTitle")}
              </Link>
              <Link href="/dashboard/student" className="btn btn-secondary py-2">
                {t("nav.dashboard")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="card ef-card p-4 p-md-5 border-0 shadow-sm">
            <div className="text-center mb-4">
              <div className="d-inline-flex p-3 rounded-circle bg-primary bg-opacity-10 text-primary mb-3">
                <i className="bi bi-credit-card-2-front-fill fs-1"></i>
              </div>
              <h1 className="h4 fw-bold text-dark mb-1">{t("reservation.paymentModalTitle")}</h1>
              <p className="text-secondary small">{t("reservation.paymentPrompt")}</p>
            </div>

            {error && (
              <div className="alert alert-danger py-2 small mb-4" role="alert">
                <i className="bi bi-exclamation-triangle-fill me-1"></i>
                {error}
              </div>
            )}

            <div className="d-flex flex-column gap-3 mb-4">
              <button
                onClick={() => handlePay("PAYE")}
                className="btn btn-success py-3 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                disabled={loading}
              >
                <i className="bi bi-check-circle-fill fs-5"></i>
                {t("reservation.paySuccess")}
              </button>

              <button
                onClick={() => handlePay("ECHOUE")}
                className="btn btn-outline-danger py-3 fw-semibold d-flex align-items-center justify-content-center gap-2"
                disabled={loading}
              >
                <i className="bi bi-x-circle fs-5"></i>
                {t("reservation.payFail")}
              </button>
            </div>

            {loading && (
              <div className="text-center py-2 text-secondary small">
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                {t("reservation.processingPayment")}
              </div>
            )}
          </div>
        )}
      </div>
    </RoleGuard>
  );
}
