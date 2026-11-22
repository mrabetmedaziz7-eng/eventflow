"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";

export default function NotFound() {
  const { t } = useI18n();

  return (
    <div className="container py-5 text-center my-auto">
      <div className="card shadow-sm p-5 border-0 ef-card mx-auto" style={{ maxWidth: "500px" }}>
        <h1 className="display-1 fw-bold text-primary mb-2">404</h1>
        <h2 className="h4 text-dark mb-3">{t("errors.codes.RESOURCE_NOT_FOUND")}</h2>
        <p className="text-secondary mb-4">{t("events.noResults")}</p>
        <div>
          <Link href="/" className="btn btn-primary px-4">
            <i className="bi bi-house me-1"></i>
            {t("nav.home")}
          </Link>
        </div>
      </div>
    </div>
  );
}

