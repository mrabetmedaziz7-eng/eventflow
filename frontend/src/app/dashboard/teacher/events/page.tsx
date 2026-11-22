"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { teacherApi } from "@/lib/api";
import type { EventItem } from "@/types/api";
import { errorMessage } from "@/lib/errors";
import RoleGuard from "@/components/common/RoleGuard";

export default function TeacherEventsListPage() {
  const { t, lang, formatDate, formatPrice } = useI18n();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionId, setActionId] = useState<number | null>(null);

  const fetchTeacherEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await teacherApi.events();
      setEvents(data);
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeacherEvents();
  }, []);

  const handlePublish = async (id: number) => {
    if (!confirm(t("teacher.publishConfirm"))) return;
    setActionId(id);
    try {
      await teacherApi.publish(id);
      setSuccessMessage("Événement publié avec succès.");
      await fetchTeacherEvents();
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setActionId(null);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm(t("teacher.cancelEventConfirm"))) return;
    setActionId(id);
    try {
      await teacherApi.cancel(id);
      setSuccessMessage("Événement annulé.");
      await fetchTeacherEvents();
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setActionId(null);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t("teacher.deleteConfirm"))) return;
    setActionId(id);
    try {
      await teacherApi.remove(id);
      setSuccessMessage("Brouillon supprimé.");
      await fetchTeacherEvents();
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setActionId(null);
    }
  };

  return (
    <RoleGuard allowedRoles={["ENSEIGNANT"]}>
      <div className="container py-5">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
          <div>
            <h1 className="h3 fw-bold text-dark mb-1">{t("teacher.myEventsTitle")}</h1>
            <p className="text-secondary small mb-0">{t("teacher.dashboardSubtitle")}</p>
          </div>
          <Link href="/dashboard/teacher/events/new" className="btn btn-primary btn-sm px-3">
            <i className="bi bi-plus-lg me-1"></i>
            {t("teacher.createNew")}
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
        ) : events.length === 0 ? (
          <div className="card ef-card p-5 text-center text-secondary border-0 shadow-sm">
            <i className="bi bi-calendar-plus fs-1 text-primary opacity-50 mb-3"></i>
            <h2 className="h5 text-dark mb-2">{t("teacher.noEvents")}</h2>
            <div className="mt-3">
              <Link href="/dashboard/teacher/events/new" className="btn btn-primary btn-sm">
                <i className="bi bi-plus-lg me-1"></i>
                {t("teacher.createNew")}
              </Link>
            </div>
          </div>
        ) : (
          <div className="card ef-card border-0 shadow-sm overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-secondary">
                    <th>{t("teacher.titleLabel")}</th>
                    <th>{t("teacher.categoryLabel")}</th>
                    <th>{t("teacher.dateLabel")}</th>
                    <th>{t("teacher.priceLabel")}</th>
                    <th>{t("common.status")}</th>
                    <th>{t("teacher.kpiSold")}</th>
                    <th className="text-end">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((evt) => (
                    <tr key={evt.id}>
                      <td>
                        <Link href={`/events/${evt.id}`} className="fw-semibold text-dark text-decoration-none">
                          {evt.title}
                        </Link>
                        <div className="text-secondary small">{evt.location}</div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark border">{evt.category}</span>
                      </td>
                      <td className="small text-secondary">{formatDate(evt.eventDate, "short")}</td>
                      <td className="fw-semibold text-dark small">
                        {evt.ticketPrice === 0 ? t("events.free") : formatPrice(evt.ticketPrice)}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            evt.status === "PUBLIE"
                              ? "ef-badge-available"
                              : evt.status === "BROUILLON"
                              ? "ef-badge-pending"
                              : "ef-badge-danger"
                          }`}
                        >
                          {evt.status}
                        </span>
                      </td>
                      <td className="small">
                        {evt.capacity - evt.availablePlaces} / {evt.capacity}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <Link
                            href={`/dashboard/teacher/events/${evt.id}/edit`}
                            className="btn btn-outline-secondary"
                            title={t("common.edit")}
                          >
                            <i className="bi bi-pencil"></i>
                          </Link>
                          <Link
                            href={`/dashboard/teacher/events/${evt.id}/participants`}
                            className="btn btn-outline-primary"
                            title={t("teacher.participantsTitle")}
                          >
                            <i className="bi bi-people"></i>
                          </Link>
                          {evt.status === "BROUILLON" && (
                            <>
                              <button
                                onClick={() => handlePublish(evt.id)}
                                className="btn btn-success"
                                disabled={actionId === evt.id}
                                title={t("teacher.publishButton")}
                              >
                                <i className="bi bi-send"></i>
                              </button>
                              <button
                                onClick={() => handleDelete(evt.id)}
                                className="btn btn-outline-danger"
                                disabled={actionId === evt.id}
                                title={t("common.delete")}
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            </>
                          )}
                          {evt.status === "PUBLIE" && (
                            <button
                              onClick={() => handleCancel(evt.id)}
                              className="btn btn-outline-danger"
                              disabled={actionId === evt.id}
                              title={t("teacher.cancelEventButton")}
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

