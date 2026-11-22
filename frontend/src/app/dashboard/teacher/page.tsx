"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { dashboardApi } from "@/lib/api";
import type { TeacherDashboard } from "@/types/api";
import { errorMessage } from "@/lib/errors";
import RoleGuard from "@/components/common/RoleGuard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function TeacherDashboardPage() {
  const { t, lang, formatNumber, formatPercent, formatPrice, formatDate } = useI18n();

  const [dashboard, setDashboard] = useState<TeacherDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    dashboardApi
      .teacher()
      .then((data) => setDashboard(data))
      .catch((err: unknown) => setError(errorMessage(err, lang)))
      .finally(() => setLoading(false));
  }, [lang]);

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50 py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  const chartData = dashboard?.events?.map((e) => ({
    title: e.title.length > 15 ? e.title.slice(0, 15) + "..." : e.title,
    revenue: e.revenue,
    placesSold: e.placesSold,
  })) || [];

  return (
    <RoleGuard allowedRoles={["ENSEIGNANT"]}>
      <div className="container py-5">
        <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
          <div>
            <h1 className="h3 fw-bold text-dark mb-1">{t("teacher.dashboardTitle")}</h1>
            <p className="text-secondary small mb-0">{t("teacher.dashboardSubtitle")}</p>
          </div>
          <div className="d-flex gap-2">
            <Link href="/dashboard/teacher/events/new" className="btn btn-primary btn-sm px-3">
              <i className="bi bi-plus-lg me-1"></i>
              {t("teacher.createNew")}
            </Link>
            <Link href="/dashboard/teacher/events" className="btn btn-outline-primary btn-sm">
              <i className="bi bi-calendar3 me-1"></i>
              {t("teacher.myEventsTitle")}
            </Link>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger py-2 small mb-4">
            <i className="bi bi-x-circle-fill me-1"></i>
            {error}
          </div>
        )}

        {/* KPIs */}
        <div className="row g-3 mb-5">
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card ef-card p-4 border-0 shadow-sm h-100">
              <span className="text-secondary small d-block mb-1">{t("teacher.kpiEvents")}</span>
              <span className="fs-3 fw-bold text-dark">{formatNumber(dashboard?.publishedEventCount)}</span>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card ef-card p-4 border-0 shadow-sm h-100">
              <span className="text-secondary small d-block mb-1">{t("teacher.kpiSold")}</span>
              <span className="fs-3 fw-bold text-primary">{formatNumber(dashboard?.placesSold)}</span>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card ef-card p-4 border-0 shadow-sm h-100">
              <span className="text-secondary small d-block mb-1">{t("teacher.kpiFillRate")}</span>
              <span className="fs-3 fw-bold text-info">
                {formatPercent(dashboard?.fillRatePercent)}
              </span>
            </div>
          </div>
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card ef-card p-4 border-0 shadow-sm h-100">
              <span className="text-secondary small d-block mb-1">{t("teacher.kpiRevenue")}</span>
              <span className="fs-3 fw-bold text-success">
                {formatPrice(dashboard?.totalRevenue)}
              </span>
            </div>
          </div>
        </div>

        {/* Revenue / Sales Chart */}
        {chartData.length > 0 && (
          <div className="card ef-card p-4 border-0 shadow-sm mb-5">
            <h2 className="h5 fw-bold text-dark mb-4">{t("teacher.kpiRevenue")} / Événement</h2>
            <div style={{ height: "260px" }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="title" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="revenue" fill="#2563EB" name="Recettes (TND)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* My Events Summary Table */}
        <div className="card ef-card border-0 shadow-sm overflow-hidden">
          <div className="card-header bg-white border-bottom py-3 d-flex justify-content-between align-items-center">
            <h2 className="h5 fw-bold text-dark mb-0">{t("teacher.myEventsTitle")}</h2>
            <Link href="/dashboard/teacher/events" className="btn btn-outline-secondary btn-sm">
              Voir tout
            </Link>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr className="small text-secondary">
                  <th>{t("teacher.titleLabel")}</th>
                  <th>{t("teacher.dateLabel")}</th>
                  <th>{t("teacher.kpiFillRate")}</th>
                  <th>{t("teacher.kpiRevenue")}</th>
                  <th>{t("common.status")}</th>
                  <th className="text-end">{t("common.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {!dashboard?.events || dashboard.events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-4 text-secondary small">
                      {t("teacher.noEvents")}
                    </td>
                  </tr>
                ) : (
                  dashboard.events.map((e) => (
                    <tr key={e.eventId}>
                      <td className="fw-semibold text-dark">{e.title}</td>
                      <td className="small text-secondary">{formatDate(e.eventDate, "short")}</td>
                      <td className="small">
                        {e.placesSold} / {e.capacity} ({formatPercent(e.fillRatePercent)})
                      </td>
                      <td className="fw-semibold text-success small">{formatPrice(e.revenue)}</td>
                      <td>
                        <span className="badge ef-badge-available">{e.status}</span>
                      </td>
                      <td className="text-end">
                        <Link
                          href={`/dashboard/teacher/events/${e.eventId}/participants`}
                          className="btn btn-outline-primary btn-sm"
                        >
                          <i className="bi bi-people me-1"></i>
                          {t("teacher.participantsTitle")}
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </RoleGuard>
  );
}

