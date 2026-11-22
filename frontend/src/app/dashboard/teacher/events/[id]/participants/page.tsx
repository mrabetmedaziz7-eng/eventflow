"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { teacherApi } from "@/lib/api";
import type { Participant, EventItem } from "@/types/api";
import { errorMessage } from "@/lib/errors";
import RoleGuard from "@/components/common/RoleGuard";

export default function EventParticipantsPage() {
  const params = useParams();
  const eventId = Number(params.id);
  const { t, lang, formatDateTime } = useI18n();

  const [event, setEvent] = useState<EventItem | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<number | null>(null);

  const fetchParticipants = async () => {
    setLoading(true);
    setError(null);
    try {
      const evt = await teacherApi.event(eventId);
      setEvent(evt);
      const list = await teacherApi.participants(eventId);
      setParticipants(list);
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchParticipants();
    }
  }, [eventId]);

  const handleRemove = async (studentId: number) => {
    if (!confirm(t("teacher.removeParticipantConfirm"))) return;
    setRemovingId(studentId);
    setError(null);
    try {
      await teacherApi.removeParticipant(eventId, studentId);
      setSuccessMessage(t("teacher.participantRemoved"));
      await fetchParticipants();
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <RoleGuard allowedRoles={["ENSEIGNANT"]}>
      <div className="container py-5">
        <div className="mb-4">
          <Link href="/dashboard/teacher/events" className="btn btn-outline-secondary btn-sm mb-3">
            <i className="bi bi-arrow-left me-1 ef-flip-rtl"></i>
            {t("teacher.myEventsTitle")}
          </Link>
          <h1 className="h3 fw-bold text-dark mb-1">{t("teacher.participantsTitle")}</h1>
          <p className="text-secondary small mb-0">
            {t("teacher.participantsSubtitle", { title: event?.title || "..." })}
          </p>
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
        ) : participants.length === 0 ? (
          <div className="card ef-card p-5 text-center text-secondary border-0 shadow-sm">
            <i className="bi bi-people fs-1 text-primary opacity-50 mb-3"></i>
            <h2 className="h5 text-dark mb-2">{t("teacher.noParticipants")}</h2>
          </div>
        ) : (
          <div className="card ef-card border-0 shadow-sm overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-secondary">
                    <th>{t("common.user")}</th>
                    <th>{t("auth.email")}</th>
                    <th>{t("reservation.placesLabel")}</th>
                    <th>{t("ticket.codeLabel")}</th>
                    <th>{t("common.status")}</th>
                    <th>{t("common.date")}</th>
                    <th className="text-end">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {participants.map((p) => (
                    <tr key={p.reservationId}>
                      <td className="fw-semibold text-dark">
                        {p.firstName} {p.lastName}
                      </td>
                      <td className="text-secondary small">{p.email}</td>
                      <td>{t("teacher.placesCount", { count: p.numberOfPlaces })}</td>
                      <td className="font-monospace small text-primary">{p.confirmationCode || "—"}</td>
                      <td>
                        <span
                          className={`badge ${
                            p.reservationStatus === "CONFIRMEE"
                              ? "ef-badge-available"
                              : "ef-badge-danger"
                          }`}
                        >
                          {p.reservationStatus}
                        </span>
                      </td>
                      <td className="text-secondary small">{formatDateTime(p.reservationDate)}</td>
                      <td className="text-end">
                        <button
                          onClick={() => handleRemove(p.studentId)}
                          className="btn btn-outline-danger btn-sm"
                          disabled={removingId === p.studentId}
                          title={t("teacher.removeParticipantButton")}
                        >
                          {removingId === p.studentId ? (
                            <span className="spinner-border spinner-border-sm"></span>
                          ) : (
                            <i className="bi bi-person-x"></i>
                          )}
                        </button>
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

