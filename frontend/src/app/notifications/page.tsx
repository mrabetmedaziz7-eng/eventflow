"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { notificationsApi } from "@/lib/api";
import type { AppNotification } from "@/types/api";
import { errorMessage } from "@/lib/errors";
import RoleGuard from "@/components/common/RoleGuard";

export default function NotificationsPage() {
  const { t, lang, formatDateTime } = useI18n();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchNotifications = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await notificationsApi.list();
      setNotifications(data);
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAsRead = async (id: number) => {
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setSuccessMessage(t("notifications.allMarkedRead"));
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <RoleGuard>
      <div className="container py-5" style={{ maxWidth: "800px" }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 fw-bold text-dark mb-1">{t("notifications.pageTitle")}</h1>
            <p className="text-secondary small mb-0">{t("notifications.pageSubtitle")}</p>
          </div>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="btn btn-outline-primary btn-sm">
              <i className="bi bi-check2-all me-1"></i>
              {t("notifications.markAllRead")}
            </button>
          )}
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
        ) : notifications.length === 0 ? (
          <div className="card ef-card p-5 text-center text-secondary border-0 shadow-sm">
            <i className="bi bi-bell-slash fs-1 text-primary opacity-50 mb-3"></i>
            <h2 className="h5 text-dark mb-2">{t("notifications.noNotifications")}</h2>
          </div>
        ) : (
          <div className="card ef-card border-0 shadow-sm overflow-hidden">
            <div className="list-group list-group-flush">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  className={`list-group-item p-4 d-flex justify-content-between align-items-start gap-3 transition ${
                    !n.read ? "bg-primary bg-opacity-10" : ""
                  }`}
                >
                  <div className="d-flex gap-3 align-items-start flex-grow-1">
                    <div className="pt-1">
                      <i
                        className={`bi ${
                          n.type.includes("APPROVED") || n.type.includes("SUCCEEDED")
                            ? "bi-check-circle-fill text-success fs-4"
                            : n.type.includes("CANCELLED") || n.type.includes("FAILED")
                            ? "bi-exclamation-circle-fill text-danger fs-4"
                            : "bi-bell-fill text-primary fs-4"
                        }`}
                      ></i>
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2 mb-1">
                        <h3 className="h6 fw-bold text-dark mb-0">{n.title}</h3>
                        {!n.read && (
                          <span className="badge bg-primary small">{t("notifications.unreadBadge")}</span>
                        )}
                      </div>
                      <p className="text-secondary small mb-1">{n.message}</p>
                      <span className="text-muted smaller d-block">{formatDateTime(n.createdAt)}</span>
                    </div>
                  </div>

                  {!n.read && (
                    <button
                      onClick={() => handleMarkAsRead(n.id)}
                      className="btn btn-outline-secondary btn-sm flex-shrink-0"
                      title={t("notifications.markAsRead")}
                    >
                      <i className="bi bi-check2"></i>
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

