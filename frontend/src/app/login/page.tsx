"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, type FormEvent, Suspense } from "react";
import { useAuth, dashboardPathFor } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { validateLogin, hasErrors, type FieldErrors } from "@/lib/validation";
import { errorMessage, apiFieldErrors } from "@/lib/errors";

function LoginForm() {
  const { login } = useAuth();
  const { t, lang } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isExpired = searchParams.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    const clientErrors = validateLogin({ email, password });
    if (hasErrors(clientErrors)) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});
    setLoading(true);

    try {
      const user = await login({ email, password });
      if (user.status === "EN_ATTENTE") {
        router.push("/pending");
      } else if (user.status !== "ACTIF") {
        router.push("/access-denied");
      } else {
        router.push(dashboardPathFor(user.role));
      }
    } catch (err: unknown) {
      setGlobalError(errorMessage(err, lang));
      setErrors(apiFieldErrors(err, lang));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-5 my-auto">
      <div className="card ef-card p-4 p-md-5 mx-auto border-0 shadow-sm" style={{ maxWidth: "480px" }}>
        <div className="text-center mb-4">
          <div className="d-inline-flex p-3 rounded-circle bg-primary bg-opacity-10 text-primary mb-3">
            <i className="bi bi-person-fill-lock fs-2"></i>
          </div>
          <h1 className="h3 fw-bold text-dark">{t("auth.loginTitle")}</h1>
          <p className="text-secondary small mb-0">{t("auth.loginSubtitle")}</p>
        </div>

        {isExpired && (
          <div className="alert alert-warning py-2 small mb-4" role="alert">
            <i className="bi bi-exclamation-triangle-fill me-1"></i>
            {t("auth.sessionExpired")}
          </div>
        )}

        {globalError && (
          <div className="alert alert-danger py-2 small mb-4" role="alert">
            <i className="bi bi-x-circle-fill me-1"></i>
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-3">
            <label htmlFor="email" className="form-label small fw-semibold text-dark">
              {t("auth.email")} <span className="text-danger">*</span>
            </label>
            <input
              id="email"
              type="email"
              className={`form-control ${errors.email ? "is-invalid" : ""}`}
              placeholder={t("auth.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              autoComplete="email"
              required
            />
            {errors.email && (
              <div className="invalid-feedback small">
                {t(errors.email)}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="form-label small fw-semibold text-dark">
              {t("auth.password")} <span className="text-danger">*</span>
            </label>
            <input
              id="password"
              type="password"
              className={`form-control ${errors.password ? "is-invalid" : ""}`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="current-password"
              required
            />
            {errors.password && (
              <div className="invalid-feedback small">
                {t(errors.password)}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-100 py-2 fw-semibold"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                {t("auth.loggingIn")}
              </>
            ) : (
              t("auth.loginButton")
            )}
          </button>
        </form>

        <div className="text-center mt-4 pt-3 border-top text-secondary small">
          {t("auth.noAccount")}{" "}
          <Link href="/register" className="text-primary fw-semibold text-decoration-none">
            {t("auth.goToRegister")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

