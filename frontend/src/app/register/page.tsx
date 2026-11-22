"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { authApi } from "@/lib/api";
import { validateRegister, hasErrors, type FieldErrors, type RegisterValues } from "@/lib/validation";
import { errorMessage, apiFieldErrors } from "@/lib/errors";
import type { RegistrableRole } from "@/types/api";

export default function RegisterPage() {
  const { t, lang } = useI18n();

  const [formData, setFormData] = useState<RegisterValues>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    const clientErrors = validateRegister(formData);
    if (hasErrors(clientErrors)) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      await authApi.register({
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        email: formData.email.trim(),
        password: formData.password,
        role: formData.role as RegistrableRole,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setGlobalError(errorMessage(err, lang));
      setErrors(apiFieldErrors(err, lang));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="container py-5 my-auto">
        <div className="card ef-card p-4 p-md-5 mx-auto border-0 shadow-sm text-center" style={{ maxWidth: "540px" }}>
          <div className="d-inline-flex p-3 rounded-circle bg-success bg-opacity-10 text-success mx-auto mb-3">
            <i className="bi bi-check-circle-fill fs-1"></i>
          </div>
          <h2 className="h4 fw-bold text-dark mb-3">{t("auth.registerSuccessTitle")}</h2>
          <p className="text-secondary mb-4">{t("auth.registerSuccessMessage")}</p>
          <div>
            <Link href="/login" className="btn btn-primary px-4 py-2">
              <i className="bi bi-box-arrow-in-right me-1"></i>
              {t("auth.goToLogin")}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-5 my-auto">
      <div className="card ef-card p-4 p-md-5 mx-auto border-0 shadow-sm" style={{ maxWidth: "560px" }}>
        <div className="text-center mb-4">
          <div className="d-inline-flex p-3 rounded-circle bg-primary bg-opacity-10 text-primary mb-3">
            <i className="bi bi-person-plus-fill fs-2"></i>
          </div>
          <h1 className="h3 fw-bold text-dark">{t("auth.registerTitle")}</h1>
          <p className="text-secondary small mb-0">{t("auth.registerSubtitle")}</p>
        </div>

        {globalError && (
          <div className="alert alert-danger py-2 small mb-4" role="alert">
            <i className="bi bi-x-circle-fill me-1"></i>
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="row g-3 mb-3">
            <div className="col-sm-6">
              <label htmlFor="firstName" className="form-label small fw-semibold text-dark">
                {t("auth.firstName")} <span className="text-danger">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                className={`form-control ${errors.firstName ? "is-invalid" : ""}`}
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                disabled={loading}
                required
              />
              {errors.firstName && (
                <div className="invalid-feedback small">{t(errors.firstName)}</div>
              )}
            </div>
            <div className="col-sm-6">
              <label htmlFor="lastName" className="form-label small fw-semibold text-dark">
                {t("auth.lastName")} <span className="text-danger">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                className={`form-control ${errors.lastName ? "is-invalid" : ""}`}
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                disabled={loading}
                required
              />
              {errors.lastName && (
                <div className="invalid-feedback small">{t(errors.lastName)}</div>
              )}
            </div>
          </div>

          <div className="mb-3">
            <label htmlFor="email" className="form-label small fw-semibold text-dark">
              {t("auth.email")} <span className="text-danger">*</span>
            </label>
            <input
              id="email"
              type="email"
              className={`form-control ${errors.email ? "is-invalid" : ""}`}
              placeholder={t("auth.emailPlaceholder")}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              disabled={loading}
              required
            />
            {errors.email && (
              <div className="invalid-feedback small">{t(errors.email)}</div>
            )}
          </div>

          <div className="mb-3">
            <label htmlFor="role" className="form-label small fw-semibold text-dark">
              {t("auth.role")} <span className="text-danger">*</span>
            </label>
            <select
              id="role"
              className={`form-select ${errors.role ? "is-invalid" : ""}`}
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as RegistrableRole })}
              disabled={loading}
              required
            >
              <option value="">{t("auth.roleSelectPlaceholder")}</option>
              <option value="ETUDIANT">{t("auth.roleStudent")}</option>
              <option value="ENSEIGNANT">{t("auth.roleTeacher")}</option>
            </select>
            {errors.role && (
              <div className="invalid-feedback small">{t(errors.role)}</div>
            )}
          </div>

          <div className="row g-3 mb-4">
            <div className="col-sm-6">
              <label htmlFor="password" className="form-label small fw-semibold text-dark">
                {t("auth.password")} <span className="text-danger">*</span>
              </label>
              <input
                id="password"
                type="password"
                className={`form-control ${errors.password ? "is-invalid" : ""}`}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                disabled={loading}
                required
              />
              {errors.password && (
                <div className="invalid-feedback small">{t(errors.password)}</div>
              )}
            </div>
            <div className="col-sm-6">
              <label htmlFor="confirmPassword" className="form-label small fw-semibold text-dark">
                {t("auth.confirmPassword")} <span className="text-danger">*</span>
              </label>
              <input
                id="confirmPassword"
                type="password"
                className={`form-control ${errors.confirmPassword ? "is-invalid" : ""}`}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                disabled={loading}
                required
              />
              {errors.confirmPassword && (
                <div className="invalid-feedback small">{t(errors.confirmPassword)}</div>
              )}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 py-2 fw-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                {t("auth.registering")}
              </>
            ) : (
              t("auth.registerButton")
            )}
          </button>
        </form>

        <div className="text-center mt-4 pt-3 border-top text-secondary small">
          {t("auth.hasAccount")}{" "}
          <Link href="/login" className="text-primary fw-semibold text-decoration-none">
            {t("auth.goToLogin")}
          </Link>
        </div>
      </div>
    </div>
  );
}

