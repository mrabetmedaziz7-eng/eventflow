"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { adminApi } from "@/lib/api";
import type { User } from "@/types/api";
import { errorMessage } from "@/lib/errors";
import RoleGuard from "@/components/common/RoleGuard";

export default function AdminUsersPage() {
  const { t, lang, formatDateTime } = useI18n();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.users();
      setUsers(data);
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleUserStatus = async (user: User) => {
    const nextStatus = user.status === "ACTIF" ? "DESACTIVE" : "ACTIF";
    setActionLoadingId(user.id);
    setError(null);
    try {
      await adminApi.setStatus(user.id, { status: nextStatus });
      setSuccessMessage(t("admin.statusUpdated"));
      await fetchUsers();
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setActionLoadingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = search.toLowerCase();
    return (
      u.firstName.toLowerCase().includes(term) ||
      u.lastName.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="container py-5">
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
          <div>
            <h1 className="h3 fw-bold text-dark mb-1">{t("admin.usersTitle")}</h1>
            <p className="text-secondary small mb-0">{t("admin.dashboardSubtitle")}</p>
          </div>
          <div className="d-flex gap-2">
            <input
              type="search"
              className="form-control form-control-sm"
              placeholder={t("admin.searchUser")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: "240px" }}
            />
            <button onClick={fetchUsers} className="btn btn-outline-primary btn-sm">
              <i className="bi bi-arrow-clockwise"></i>
            </button>
          </div>
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
        ) : filteredUsers.length === 0 ? (
          <div className="card ef-card p-5 text-center text-secondary border-0 shadow-sm">
            <i className="bi bi-people fs-1 mb-2"></i>
            <p className="mb-0">{t("common.empty")}</p>
          </div>
        ) : (
          <div className="card ef-card border-0 shadow-sm overflow-hidden">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr className="small text-secondary">
                    <th>{t("common.user")}</th>
                    <th>{t("auth.email")}</th>
                    <th>{t("auth.role")}</th>
                    <th>{t("common.status")}</th>
                    <th>{t("common.date")}</th>
                    <th className="text-end">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id}>
                      <td className="fw-semibold text-dark">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="text-secondary small">{u.email}</td>
                      <td>
                        <span className={`badge ${u.role === "ADMIN" ? "bg-dark" : u.role === "ENSEIGNANT" ? "bg-primary" : "bg-info text-dark"}`}>
                          {t(`auth.roles.${u.role}`)}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${u.status === "ACTIF" ? "ef-badge-available" : u.status === "EN_ATTENTE" ? "ef-badge-pending" : "ef-badge-danger"}`}>
                          {t(`auth.statuses.${u.status}`)}
                        </span>
                      </td>
                      <td className="text-secondary small">
                        {formatDateTime(u.createdAt)}
                      </td>
                      <td className="text-end">
                        {u.role !== "ADMIN" && (
                          <button
                            onClick={() => toggleUserStatus(u)}
                            className={`btn btn-sm ${u.status === "ACTIF" ? "btn-outline-danger" : "btn-outline-success"}`}
                            disabled={actionLoadingId === u.id}
                          >
                            {actionLoadingId === u.id ? (
                              <span className="spinner-border spinner-border-sm"></span>
                            ) : u.status === "ACTIF" ? (
                              t("admin.deactivate")
                            ) : (
                              t("admin.activate")
                            )}
                          </button>
                        )}
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

