"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { eventsApi } from "@/lib/api";
import type { EventItem } from "@/types/api";
import { getAvailability } from "@/lib/events";

export default function HomePage() {
  const { t, formatDate, formatPrice } = useI18n();
  const [featuredEvents, setFeaturedEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    eventsApi
      .list({ availableOnly: true })
      .then((data) => {
        setFeaturedEvents(data.slice(0, 3));
      })
      .catch(() => setFeaturedEvents([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="pb-5">
      {/* Hero Section */}
      <section className="bg-white border-bottom py-5">
        <div className="container-xl py-4 text-center text-lg-start">
          <div className="row align-items-center g-4">
            <div className="col-lg-7">
              <span className="badge ef-badge-available mb-3 px-3 py-2 fs-6">
                <i className="bi bi-mortarboard-fill me-1"></i>
                {t("home.badge")}
              </span>
              <h1 className="display-4 fw-bold text-dark mb-3">
                {t("home.heroTitle")}
              </h1>
              <p className="lead text-secondary mb-4">
                {t("home.heroSubtitle")}
              </p>
              <div className="d-flex flex-wrap gap-3 justify-content-center justify-content-lg-start">
                <Link href="/events" className="btn btn-primary btn-lg px-4 py-2">
                  <i className="bi bi-search me-2"></i>
                  {t("home.exploreButton")}
                </Link>
                <Link href="/register" className="btn btn-outline-primary btn-lg px-4 py-2">
                  <i className="bi bi-person-plus me-2"></i>
                  {t("home.createAccountButton")}
                </Link>
              </div>
            </div>
            <div className="col-lg-5 text-center">
              <div className="p-4 rounded-4 ef-image-placeholder border" style={{ height: "300px" }}>
                <div className="text-center">
                  <i className="bi bi-calendar-check text-primary display-1 mb-2"></i>
                  <h3 className="h5 fw-bold text-dark">EventFlow — ISET Nabeul</h3>
                  <p className="text-secondary small mb-0">Participez, organisez et dynamisez votre vie étudiante.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="container-xl py-5">
        <div className="row g-4">
          <div className="col-md-4">
            <div className="card h-100 ef-card p-4 border-0">
              <div className="text-primary fs-1 mb-3">
                <i className="bi bi-compass"></i>
              </div>
              <h4 className="h5 fw-bold text-dark">{t("home.features.discoveryTitle")}</h4>
              <p className="text-secondary mb-0">{t("home.features.discoveryDesc")}</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 ef-card p-4 border-0">
              <div className="text-primary fs-1 mb-3">
                <i className="bi bi-ticket-perforated"></i>
              </div>
              <h4 className="h5 fw-bold text-dark">{t("home.features.reservationTitle")}</h4>
              <p className="text-secondary mb-0">{t("home.features.reservationDesc")}</p>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card h-100 ef-card p-4 border-0">
              <div className="text-primary fs-1 mb-3">
                <i className="bi bi-grid-1x2"></i>
              </div>
              <h4 className="h5 fw-bold text-dark">{t("home.features.dashboardTitle")}</h4>
              <p className="text-secondary mb-0">{t("home.features.dashboardDesc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Events */}
      <section className="container-xl py-4">
        <div className="d-flex justify-content-between align-items-end mb-4">
          <div>
            <h2 className="h3 fw-bold text-dark mb-1">{t("home.featuredTitle")}</h2>
            <p className="text-secondary mb-0">{t("home.featuredSubtitle")}</p>
          </div>
          <Link href="/events" className="btn btn-outline-primary btn-sm">
            {t("home.viewAll")} <i className="bi bi-arrow-right ms-1 ef-flip-rtl"></i>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : featuredEvents.length === 0 ? (
          <div className="card ef-card p-5 text-center text-secondary border-0">
            <i className="bi bi-calendar-x fs-1 mb-2"></i>
            <p className="mb-0">{t("home.noFeatured")}</p>
          </div>
        ) : (
          <div className="row g-4">
            {featuredEvents.map((evt) => {
              const avail = getAvailability(evt);
              return (
                <div key={evt.id} className="col-md-4">
                  <div className="card h-100 ef-card ef-card-interactive border-0 overflow-hidden">
                    <div
                      className="ef-image-placeholder position-relative"
                      style={{ height: "160px" }}
                    >
                      {evt.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={evt.imageUrl}
                          alt={evt.title}
                          className="w-100 h-100 object-fit-cover"
                          onError={(e) => {
                            (e.currentTarget as HTMLImageElement).style.display = "none";
                          }}
                        />
                      ) : (
                        <i className="bi bi-calendar-event fs-1 text-primary opacity-50"></i>
                      )}
                      <span className="position-absolute top-0 end-0 m-2 badge bg-dark bg-opacity-75">
                        {evt.category}
                      </span>
                    </div>
                    <div className="card-body d-flex flex-column p-4">
                      <div className="mb-2">
                        {avail === "AVAILABLE" && (
                          <span className="badge ef-badge-available">{t("events.availability.AVAILABLE")}</span>
                        )}
                        {avail === "ALMOST_FULL" && (
                          <span className="badge ef-badge-almost">{t("events.availability.ALMOST_FULL")}</span>
                        )}
                        {avail === "FULL" && (
                          <span className="badge ef-badge-danger">{t("events.availability.FULL")}</span>
                        )}
                      </div>
                      <h3 className="h5 fw-bold text-dark card-title mb-2">{evt.title}</h3>
                      <p className="text-secondary small mb-3 flex-grow-1">
                        {evt.description ? evt.description.slice(0, 100) + "..." : ""}
                      </p>
                      <div className="text-secondary small mb-3">
                        <div>
                          <i className="bi bi-calendar3 me-1"></i> {formatDate(evt.eventDate, "short")}
                        </div>
                        <div>
                          <i className="bi bi-geo-alt me-1"></i> {evt.location}
                        </div>
                      </div>
                      <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-auto">
                        <span className="fw-bold text-primary">
                          {evt.ticketPrice === 0 ? t("events.free") : formatPrice(evt.ticketPrice)}
                        </span>
                        <Link href={`/events/${evt.id}`} className="btn btn-outline-primary btn-sm">
                          {t("events.viewDetail")}
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
