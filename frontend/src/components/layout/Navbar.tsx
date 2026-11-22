"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { useI18n, type Lang } from "@/lib/i18n";
import { notificationsApi } from "@/lib/api";

export default function Navbar() {
  const { status, user, logout } = useAuth();
  const { t, lang, setLang } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    if (status === "authenticated") {
      notificationsApi
        .list()
        .then((items) => {
          setUnreadCount(items.filter((n) => !n.read).length);
        })
        .catch(() => {});
    }
  }, [status, pathname]);

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  const isActive = (path: string) => pathname === path;

  return (
    <header className="ef-navbar sticky-top border-bottom border-secondary border-opacity-25 shadow-sm">
      <nav className="navbar navbar-expand-lg navbar-dark py-2 px-3 container-xl">
        <Link href="/" className="navbar-brand d-flex align-items-center gap-2">
          <i className="bi bi-calendar2-event-fill text-warning fs-4"></i>
          <span className="fw-bold tracking-tight">EventFlow</span>
        </Link>

        <button
          className="navbar-toggler"
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="navbar-toggler-icon"></span>
        </button>

        <div className={`collapse navbar-collapse ${mobileMenuOpen ? "show" : ""}`}>
          <ul className="navbar-nav me-auto mb-2 mb-lg-0 gap-lg-1">
            <li className="nav-item">
              <Link
                href="/"
                className={`nav-link px-3 ${isActive("/") ? "active fw-semibold" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("nav.home")}
              </Link>
            </li>
            <li className="nav-item">
              <Link
                href="/events"
                className={`nav-link px-3 ${isActive("/events") ? "active fw-semibold" : ""}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                {t("nav.events")}
              </Link>
            </li>

            {/* Role-specific Nav Links */}
            {user?.role === "ADMIN" && (
              <>
                <li className="nav-item">
                  <Link
                    href="/dashboard/admin"
                    className={`nav-link px-3 ${isActive("/dashboard/admin") ? "active fw-semibold" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.dashboard")}
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    href="/dashboard/admin/pending"
                    className={`nav-link px-3 ${isActive("/dashboard/admin/pending") ? "active fw-semibold" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.adminPending")}
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    href="/dashboard/admin/users"
                    className={`nav-link px-3 ${isActive("/dashboard/admin/users") ? "active fw-semibold" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.adminUsers")}
                  </Link>
                </li>
              </>
            )}

            {user?.role === "ENSEIGNANT" && (
              <>
                <li className="nav-item">
                  <Link
                    href="/dashboard/teacher"
                    className={`nav-link px-3 ${isActive("/dashboard/teacher") ? "active fw-semibold" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.dashboard")}
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    href="/dashboard/teacher/events"
                    className={`nav-link px-3 ${isActive("/dashboard/teacher/events") ? "active fw-semibold" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.myEvents")}
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    href="/"
                    className="nav-link px-3"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.participants")}
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    href="/dashboard/teacher/events/new"
                    className={`nav-link px-3 ${isActive("/dashboard/teacher/events/new") ? "active fw-semibold" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-plus-circle me-1"></i>
                    {t("nav.createEvent")}
                  </Link>
                </li>
              </>
            )}

            {user?.role === "ETUDIANT" && (
              <>
                <li className="nav-item">
                  <Link
                    href="/dashboard/student"
                    className={`nav-link px-3 ${isActive("/dashboard/student") ? "active fw-semibold" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.dashboard")}
                  </Link>
                </li>
                <li className="nav-item">
                  <Link
                    href="/dashboard/student/reservations"
                    className={`nav-link px-3 ${isActive("/dashboard/student/reservations") ? "active fw-semibold" : ""}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    {t("nav.myReservations")}
                  </Link>
                </li>
              </>
            )}
          </ul>

          <div className="d-flex align-items-center gap-2 flex-wrap mt-3 mt-lg-0">
            {/* Language Selector */}
            <div className="btn-group btn-group-sm" role="group" aria-label="Language selector">
              {(["fr", "en", "ar"] as Lang[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  className={`btn ${lang === l ? "btn-light text-primary fw-bold" : "btn-outline-light text-white"}`}
                  onClick={() => setLang(l)}
                >
                  {l.toUpperCase()}
                </button>
              ))}
            </div>

            {/* Notifications Bell */}
            {status === "authenticated" && (
              <Link
                href="/notifications"
                className="btn btn-outline-light btn-sm position-relative ms-1"
                aria-label={t("nav.unreadCount", { count: unreadCount })}
                title={t("nav.notifications")}
              >
                <i className="bi bi-bell-fill"></i>
                {unreadCount > 0 && (
                  <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger border border-light">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Link>
            )}

            {/* Auth actions */}
            {status === "loading" ? (
              <div className="spinner-border spinner-border-sm text-light ms-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            ) : status === "authenticated" && user ? (
              <div className="d-flex align-items-center gap-2 ms-lg-2">
                <Link
                  href="/profile"
                  className="btn btn-outline-light btn-sm d-flex align-items-center gap-1"
                  title={user.email}
                >
                  <i className="bi bi-person-circle"></i>
                  <span className="d-none d-sm-inline">{user.firstName}</span>
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn btn-warning btn-sm fw-semibold text-dark"
                >
                  <i className="bi bi-box-arrow-right me-1"></i>
                  {t("nav.logout")}
                </button>
              </div>
            ) : (
              <div className="d-flex align-items-center gap-2 ms-lg-2">
                <Link href="/login" className="btn btn-outline-light btn-sm">
                  {t("nav.login")}
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm text-white fw-medium">
                  {t("nav.register")}
                </Link>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}
