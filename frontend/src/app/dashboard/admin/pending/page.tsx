"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { adminApi } from "@/lib/api";
import type { User, RegistrableRole } from "@/types/api";
import { errorMessage } from "@/lib/errors";
import RoleGuard from "@/components/common/RoleGuard";

export default function AdminPendingUsersPage() {
  const { t, lang, formatDateTime } = useI18n();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Validation modal state
  const [validatingUser, setValidatingUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<RegistrableRole>("ETUDIANT");
  const [actionLoading, setActionLoading] = useState(false);

  // Reject modal state
  const [rejectingUser, setRejectingUser] = useState<User | null>(null);

  const fetchPendingUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminApi.pending();
      setUsers(data);
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  const openValidateModal = (user: User) => {
    setValidatingUser(user);
    setSelectedRole(user.role === "ENSEIGNANT" ? "ENSEIGNANT" : "ETUDIANT");
  };

  const handleConfirmValidate = async () => {
    if (!validatingUser) return;
    setActionLoading(true);
    try {
      await adminApi.validate(validatingUser.id, { role: selectedRole });
      setSuccessMessage(`Compte de ${validatingUser.firstName} ${validatingUser.lastName} validé avec le rôle ${selectedRole}.`);
      setValidatingUser(null);
      await fetchPendingUsers();
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingUser) return;
    setActionLoading(true);
    try {
      await adminApi.reject(rejectingUser.id);
      setSuccessMessage(`Demande de ${rejectingUser.firstName} ${rejectingUser.lastName} refusée.`);
      setRejectingUser(null);
      await fetchPendingUsers();
    } catch (err: unknown) {
      setError(errorMessage(err, lang));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 fw-bold text-dark mb-1">{t("admin.pendingTitle")}</h1>
            <p className="text-secondary small mb-0">{t("admin.dashboardSubtitle")}</p>
          </div>
          <button onClick={fetchPendingUsers} className="btn btn-outline-primary btn-sm">
            <i className="bi bi-arrow-clockwise me-1"></i>
            {t("common.retry")}
          </button>
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
        ) : users.length === 0 ? (
          <div className="card ef-card p-5 text-center text-secondary border-0 shadow-sm">
            <i className="bi bi-person-check fs-1 text-success mb-2"></i>
            <p className="mb-0">{t("admin.noPending")}</p>
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
                    <th>{t("common.date")}</th>
                    <th className="text-end">{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="fw-semibold text-dark">
                        {u.firstName} {u.lastName}
                      </td>
                      <td className="text-secondary small">{u.email}</td>
                      <td>
                        <span className="badge bg-secondary">
                          {t(`auth.roles.${u.role}`)}
                        </span>
                      </td>
                      <td className="text-secondary small">
                        {formatDateTime(u.createdAt)}
                      </td>
                      <td className="text-end">
                        <div className="btn-group btn-group-sm">
                          <button
                            onClick={() => openValidateModal(u)}
                            className="btn btn-success"
                            title={t("admin.validateButton")}
                          >
                            <i className="bi bi-check-lg me-1"></i>
                            {t("admin.activate")}
                          </button>
                          <button
                            onClick={() => setRejectingUser(u)}
                            className="btn btn-outline-danger"
                            title={t("admin.rejectButton")}
                          >
                            <i className="bi bi-x-lg me-1"></i>
                            {t("admin.rejectButton")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Validate Modal */}
        {validatingUser && (
          <div className="modal show d-block bg-dark bg-opacity-50" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 ef-card shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold text-dark">
                    {t("admin.validateModalTitle", { name: `${validatingUser.firstName} ${validatingUser.lastName}` })}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setValidatingUser(null)}></button>
                </div>
                <div className="modal-body">
                  <p className="text-secondary small mb-3">{t("admin.validatePrompt")}</p>
                  <div className="mb-3">
                    <label className="form-label small fw-semibold text-dark">{t("auth.role")}</label>
                    <select
                      className="form-select"
                      value={selectedRole}
                      onChange={(e) => setSelectedRole(e.target.value as RegistrableRole)}
                    >
                      <option value="ETUDIANT">{t("auth.roleStudent")}</option>
                      <option value="ENSEIGNANT">{t("auth.roleTeacher")}</option>
                    </select>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setValidatingUser(null)}>
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={handleConfirmValidate}
                    disabled={actionLoading}
                  >
                    {actionLoading ? t("admin.validating") : t("admin.validateButton")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reject Modal */}
        {rejectingUser && (
          <div className="modal show d-block bg-dark bg-opacity-50" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 ef-card shadow">
                <div className="modal-header">
                  <h5 className="modal-title fw-bold text-danger">
                    {t("admin.rejectModalTitle", { name: `${rejectingUser.firstName} ${rejectingUser.lastName}` })}
                  </h5>
                  <button type="button" className="btn-close" onClick={() => setRejectingUser(null)}></button>
                </div>
                <div className="modal-body">
                  <p className="text-secondary mb-0">{t("admin.rejectPrompt")}</p>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setRejectingUser(null)}>
                    {t("common.cancel")}
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleConfirmReject}
                    disabled={actionLoading}
                  >
                    {actionLoading ? t("admin.rejecting") : t("admin.rejectButton")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

