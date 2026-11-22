  "use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { dashboardApi, historyApi } from "@/lib/api";
import type { AdminDashboard, HistoryEntry } from "@/types/api";
import { errorMessage } from "@/lib/errors";
import RoleGuard from "@/components/common/RoleGuard";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const COLORS = ["#2563EB", "#10B981", "#F59E0B", "#EF4444", "#6B7280"];

export default function AdminDashboardPage() {
  const { t, lang, formatNumber, formatPrice, formatDateTime } = useI18n();

  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([dashboardApi.admin(), historyApi.list()])
      .then(([dash, hist]) => {
        setDashboard(dash);
        setHistory(hist.slice(0, 10)); // Top 10 recent
      })
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

  const roleChartData = dashboard?.usersByRole
    ? Object.entries(dashboard.usersByRole).map(([role, count]) => ({
        name: t(`auth.roles.${role}`) || role,
        value: count,
      }))
    : [];

  const statusChartData = dashboard?.usersByStatus
    ? Object.entries(dashboard.usersByStatus).map(([st, count]) => ({
        name: t(`auth.statuses.${st}`) || st,
        count: count,
      }))
    : [];

  return (
    <RoleGuard allowedRoles={["ADMIN"]}>
      <div className="container py-5">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 fw-bold text-dark mb-1">{t("admin.dashboardTitle")}</h1>
            <p className="text-secondary small mb-0">{t("admin.dashboardSubtitle")}</p>
          </div>
          <div className="d-flex gap-2">
            <Link href="/dashboard/admin/pending" className="btn btn-outline-warning btn-sm fw-semibold">
              <i className="bi bi-person-exclamation me-1"></i>
              {t("nav.adminPending")}
            </Link>
            <Link href="/dashboard/admin/users" className="btn btn-outline-primary btn-sm">
              <i className="bi bi-people me-1"></i>
              {t("nav.adminUsers")}
            </Link>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger py-2 small mb-4">
            <i className="bi bi-x-circle-fill me-1"></i>
            {error}
          </div>
        )}

        {/* KPI Cards */}
        <div className="row g-3 mb-5">
          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card ef-card p-4 border-0 shadow-sm h-100">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <span className="text-secondary small d-block mb-1">{t("admin.kpiUsers")}</span>
                  <span className="fs-3 fw-bold text-dark">
                    {formatNumber(
                      dashboard?.usersByStatus ? Object.values(dashboard.usersByStatus).reduce((a, b) => a + b, 0) : 0
                    )}
                  </span>
                </div>
                <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
                  <i className="bi bi-people fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card ef-card p-4 border-0 shadow-sm h-100">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <span className="text-secondary small d-block mb-1">{t("admin.kpiPending")}</span>
                  <span className="fs-3 fw-bold text-warning">
                    {formatNumber(dashboard?.usersByStatus?.EN_ATTENTE || 0)}
                  </span>
                </div>
                <div className="p-2 bg-warning bg-opacity-10 text-warning rounded-3">
                  <i className="bi bi-hourglass-split fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card ef-card p-4 border-0 shadow-sm h-100">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <span className="text-secondary small d-block mb-1">{t("admin.kpiEvents")}</span>
                  <span className="fs-3 fw-bold text-dark">{formatNumber(dashboard?.eventCount)}</span>
                </div>
                <div className="p-2 bg-info bg-opacity-10 text-info rounded-3">
                  <i className="bi bi-calendar-event fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-sm-6 col-lg-3">
            <div className="card ef-card p-4 border-0 shadow-sm h-100">
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <span className="text-secondary small d-block mb-1">{t("admin.kpiRevenue")}</span>
                  <span className="fs-3 fw-bold text-success">
                    {formatPrice(dashboard?.simulatedRevenue)}
                  </span>
                </div>
                <div className="p-2 bg-success bg-opacity-10 text-success rounded-3">
                  <i className="bi bi-cash-stack fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="row g-4 mb-5">
          <div className="col-lg-6">
            <div className="card ef-card p-4 border-0 shadow-sm h-100">
              <h2 className="h5 fw-bold text-dark mb-4">{t("admin.usersByRole")}</h2>
              <div style={{ height: "260px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={roleChartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {roleChartData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="col-lg-6">
            <div className="card ef-card p-4 border-0 shadow-sm h-100">
              <h2 className="h5 fw-bold text-dark mb-4">{t("admin.usersByStatus")}</h2>
              <div style={{ height: "260px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusChartData}>
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#2563EB" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Platform Audit Log History */}
        <div className="card ef-card border-0 shadow-sm overflow-hidden">
          <div className="card-header bg-white border-bottom py-3">
            <h2 className="h5 fw-bold text-dark mb-0">{t("admin.historyTitle")}</h2>
          </div>
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr className="small text-secondary">
                  <th>Action</th>
                  <th>Entité</th>
                  <th>Description</th>
                  <th className="text-end">{t("common.date")}</th>
                </tr>
              </thead>
              <tbody>
                {history.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4 text-secondary small">
                      {t("admin.noHistory")}
                    </td>
                  </tr>
                ) : (
                  history.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <span className="badge bg-light text-dark border">
                          {t(`history.actionTypes.${h.actionType}`) !== `history.actionTypes.${h.actionType}`
                            ? t(`history.actionTypes.${h.actionType}`)
                            : h.actionType}
                        </span>
                      </td>
                      <td className="small font-monospace text-secondary">{h.entityType} #{h.entityId}</td>
                      <td className="small text-dark">{h.description}</td>
                      <td className="small text-secondary text-end">{formatDateTime(h.createdAt)}</td>
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
