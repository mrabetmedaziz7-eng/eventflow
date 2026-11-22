"use client";

import { useI18n } from "@/lib/i18n";

export default function Footer() {
  const { t } = useI18n();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-white border-top py-4 mt-auto">
      <div className="container-xl d-flex flex-column flex-md-row justify-content-between align-items-center gap-3 text-secondary small">
        <div className="d-flex align-items-center gap-2">
          <i className="bi bi-calendar2-event text-primary fs-5"></i>
          <span className="fw-semibold text-dark">EventFlow</span>
          <span>— {t("brand.tagline")}</span>
        </div>
        <div>
          <span>{t("common.copyright", { year })}</span>
        </div>
      </div>
    </footer>
  );
}
