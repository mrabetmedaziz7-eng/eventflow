"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { useAuth } from "@/lib/auth";

export default function PendingAccountPage() {
  const { t } = useI18n();
  const { logout, user } = useAuth();

  return (
    <div className="container py-5 my-auto text-center">
      <div className="card ef-card p-5 border-0 shadow-sm mx-auto" style={{ maxWidth: "560px" }}>
        <div className="text-warning display-1 mb-3">
          <i className="bi bi-hourglass-split"></i>
        </div>
        <h1 className="h3 fw-bold text-dark mb-2">{t("pending.title")}</h1>
        <p className="text-secondary mb-4">{t("pending.message")}</p>
        <div className="d-flex justify-content-center gap-2">
          <Link href="/" className="btn btn-outline-primary">
            <i className="bi bi-house me-1"></i>
            {t("pending.backHome")}
          </Link>
          {user && (
            <button onClick={() => logout()} className="btn btn-primary">
              <i className="bi bi-box-arrow-right me-1"></i>
              {t("nav.logout")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

