"use client";

import { useState, type FormEvent, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { usersApi } from "@/lib/api";
import { validateProfile, validatePasswordChange, hasErrors, type FieldErrors } from "@/lib/validation";
import { errorMessage, apiFieldErrors } from "@/lib/errors";
import RoleGuard from "@/components/common/RoleGuard";

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const { t, lang } = useI18n();

  // Profile Form state
  const [firstName, setFirstName] = useState(user?.firstName || "");
  const [lastName, setLastName] = useState(user?.lastName || "");
  const [profileErrors, setProfileErrors] = useState<FieldErrors>({});
  const [profileGlobalError, setProfileGlobalError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Password Form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdErrors, setPwdErrors] = useState<FieldErrors>({});
  const [pwdGlobalError, setPwdGlobalError] = useState<string | null>(null);
  const [pwdSuccess, setPwdSuccess] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName);
      setLastName(user.lastName);
    }
  }, [user]);

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setProfileGlobalError(null);
    setProfileSuccess(false);

    const clientErrors = validateProfile({ firstName, lastName });
    if (hasErrors(clientErrors)) {
      setProfileErrors(clientErrors);
      return;
    }
    setProfileErrors({});
    setSavingProfile(true);

    try {
      const updated = await usersApi.updateMe({ firstName: firstName.trim(), lastName: lastName.trim() });
      setUser(updated);
      setProfileSuccess(true);
    } catch (err: unknown) {
      setProfileGlobalError(errorMessage(err, lang));
      setProfileErrors(apiFieldErrors(err, lang));
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPwdGlobalError(null);
    setPwdSuccess(false);

    const clientErrors = validatePasswordChange({ currentPassword, newPassword, confirmPassword });
    if (hasErrors(clientErrors)) {
      setPwdErrors(clientErrors);
      return;
    }
    setPwdErrors({});
    setSavingPwd(true);

    try {
      await usersApi.changePassword({ currentPassword, newPassword });
      setPwdSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPwdGlobalError(errorMessage(err, lang));
      setPwdErrors(apiFieldErrors(err, lang));
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <RoleGuard>
      <div className="container py-5">
        <div className="mb-4">
          <h1 className="h3 fw-bold text-dark mb-1">{t("profile.title")}</h1>
          <p className="text-secondary">{t("profile.subtitle")}</p>
        </div>

        <div className="row g-4">
          {/* Identity info */}
          <div className="col-lg-6">
            <div className="card ef-card p-4 border-0 h-100 shadow-sm">
              <h2 className="h5 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-person-lines-fill text-primary"></i>
                {t("profile.identityCard")}
              </h2>

              {profileSuccess && (
                <div className="alert alert-success py-2 small mb-3">
                  <i className="bi bi-check-circle-fill me-1"></i>
                  {t("profile.profileSaved")}
                </div>
              )}
              {profileGlobalError && (
                <div className="alert alert-danger py-2 small mb-3">
                  <i className="bi bi-x-circle-fill me-1"></i>
                  {profileGlobalError}
                </div>
              )}

              <div className="bg-light p-3 rounded mb-3 small">
                <div className="mb-1">
                  <span className="fw-semibold text-dark">{t("auth.email")}:</span> {user?.email}
                </div>
                <div className="mb-1">
                  <span className="fw-semibold text-dark">{t("profile.roleLabel")}</span>{" "}
                  <span className="badge bg-primary">
                    {user?.role ? t(`auth.roles.${user.role}`) : ""}
                  </span>
                </div>
                <div>
                  <span className="fw-semibold text-dark">{t("profile.statusLabel")}</span>{" "}
                  <span className="badge ef-badge-available">
                    {user?.status ? t(`auth.statuses.${user.status}`) : ""}
                  </span>
                </div>
              </div>

              <form onSubmit={handleProfileSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="firstName" className="form-label small fw-semibold text-dark">
                    {t("auth.firstName")} <span className="text-danger">*</span>
                  </label>
                  <input
                    id="firstName"
                    type="text"
                    className={`form-control ${profileErrors.firstName ? "is-invalid" : ""}`}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={savingProfile}
                    required
                  />
                  {profileErrors.firstName && (
                    <div className="invalid-feedback small">{t(profileErrors.firstName)}</div>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="lastName" className="form-label small fw-semibold text-dark">
                    {t("auth.lastName")} <span className="text-danger">*</span>
                  </label>
                  <input
                    id="lastName"
                    type="text"
                    className={`form-control ${profileErrors.lastName ? "is-invalid" : ""}`}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={savingProfile}
                    required
                  />
                  {profileErrors.lastName && (
                    <div className="invalid-feedback small">{t(profileErrors.lastName)}</div>
                  )}
                </div>

                <button type="submit" className="btn btn-primary w-100" disabled={savingProfile}>
                  {savingProfile ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      {t("profile.savingProfile")}
                    </>
                  ) : (
                    t("profile.saveProfile")
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Password update */}
          <div className="col-lg-6">
            <div className="card ef-card p-4 border-0 h-100 shadow-sm">
              <h2 className="h5 fw-bold text-dark mb-3 d-flex align-items-center gap-2">
                <i className="bi bi-shield-lock text-primary"></i>
                {t("profile.securityCard")}
              </h2>

              {pwdSuccess && (
                <div className="alert alert-success py-2 small mb-3">
                  <i className="bi bi-check-circle-fill me-1"></i>
                  {t("profile.passwordSaved")}
                </div>
              )}
              {pwdGlobalError && (
                <div className="alert alert-danger py-2 small mb-3">
                  <i className="bi bi-x-circle-fill me-1"></i>
                  {pwdGlobalError}
                </div>
              )}

              <form onSubmit={handlePasswordSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="currentPassword" className="form-label small fw-semibold text-dark">
                    {t("profile.currentPassword")} <span className="text-danger">*</span>
                  </label>
                  <input
                    id="currentPassword"
                    type="password"
                    className={`form-control ${pwdErrors.currentPassword ? "is-invalid" : ""}`}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    disabled={savingPwd}
                    required
                  />
                  {pwdErrors.currentPassword && (
                    <div className="invalid-feedback small">{t(pwdErrors.currentPassword)}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="newPassword" className="form-label small fw-semibold text-dark">
                    {t("profile.newPassword")} <span className="text-danger">*</span>
                  </label>
                  <input
                    id="newPassword"
                    type="password"
                    className={`form-control ${pwdErrors.newPassword ? "is-invalid" : ""}`}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={savingPwd}
                    required
                  />
                  {pwdErrors.newPassword && (
                    <div className="invalid-feedback small">{t(pwdErrors.newPassword)}</div>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="confirmPassword" className="form-label small fw-semibold text-dark">
                    {t("auth.confirmPassword")} <span className="text-danger">*</span>
                  </label>
                  <input
                    id="confirmPassword"
                    type="password"
                    className={`form-control ${pwdErrors.confirmPassword ? "is-invalid" : ""}`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={savingPwd}
                    required
                  />
                  {pwdErrors.confirmPassword && (
                    <div className="invalid-feedback small">{t(pwdErrors.confirmPassword)}</div>
                  )}
                </div>

                <button type="submit" className="btn btn-outline-primary w-100" disabled={savingPwd}>
                  {savingPwd ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      {t("profile.savingPassword")}
                    </>
                  ) : (
                    t("profile.savePassword")
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

