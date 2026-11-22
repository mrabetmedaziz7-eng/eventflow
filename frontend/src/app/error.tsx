"use client";

import { useI18n } from "@/lib/i18n";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="container py-5 text-center my-auto">
      <div className="card shadow-sm p-5 max-w-lg mx-auto border-danger">
        <i className="bi bi-exclamation-triangle-fill text-danger fs-1 mb-3"></i>
        <h2 className="h4 text-dark mb-2">{t("common.errorOccurred")}</h2>
        <p className="text-secondary mb-4">{error.message || t("errors.generic")}</p>
        <div>
          <button onClick={() => reset()} className="btn btn-primary px-4">
            <i className="bi bi-arrow-clockwise me-1"></i>
            {t("common.retry")}
          </button>
        </div>
      </div>
    </div>
  );
}

