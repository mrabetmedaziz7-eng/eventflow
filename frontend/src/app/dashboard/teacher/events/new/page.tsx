"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { teacherApi } from "@/lib/api";
import {
  validateEvent,
  toEventRequest,
  hasErrors,
  type FieldErrors,
  type EventFormValues,
} from "@/lib/validation";
import { errorMessage, apiFieldErrors } from "@/lib/errors";
import { EVENT_CATEGORIES } from "@/lib/events";
import RoleGuard from "@/components/common/RoleGuard";

export default function CreateEventPage() {
  const { t, lang } = useI18n();
  const router = useRouter();

  const [formData, setFormData] = useState<EventFormValues>({
    title: "",
    description: "",
    category: "TECH",
    eventDate: "",
    startTime: "09:00",
    endTime: "12:00",
    location: "",
    imageUrl: "",
    ticketPrice: "0",
    capacity: "50",
  });

  const [errors, setErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    const clientErrors = validateEvent(formData);
    if (hasErrors(clientErrors)) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const payload = toEventRequest(formData);
      const created = await teacherApi.create(payload);
      router.push(`/dashboard/teacher/events/${created.id}/edit?created=1`);
    } catch (err: unknown) {
      setGlobalError(errorMessage(err, lang));
      setErrors(apiFieldErrors(err, lang));
    } finally {
      setSaving(false);
    }
  };

  return (
    <RoleGuard allowedRoles={["ENSEIGNANT"]}>
      <div className="container py-5" style={{ maxWidth: "800px" }}>
        <div className="mb-4">
          <Link href="/dashboard/teacher/events" className="btn btn-outline-secondary btn-sm mb-3">
            <i className="bi bi-arrow-left me-1 ef-flip-rtl"></i>
            {t("teacher.myEventsTitle")}
          </Link>
          <h1 className="h3 fw-bold text-dark mb-1">{t("teacher.formCreateTitle")}</h1>
          <p className="text-secondary small mb-0">{t("teacher.dashboardSubtitle")}</p>
        </div>

        {globalError && (
          <div className="alert alert-danger py-2 small mb-4" role="alert">
            <i className="bi bi-x-circle-fill me-1"></i>
            {globalError}
          </div>
        )}

        <div className="card ef-card p-4 p-md-5 border-0 shadow-sm">
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-3">
              <label htmlFor="title" className="form-label small fw-semibold text-dark">
                {t("teacher.titleLabel")} <span className="text-danger">*</span>
              </label>
              <input
                id="title"
                type="text"
                className={`form-control ${errors.title ? "is-invalid" : ""}`}
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                disabled={saving}
                required
              />
              {errors.title && <div className="invalid-feedback small">{t(errors.title)}</div>}
            </div>

            <div className="row g-3 mb-3">
              <div className="col-sm-6">
                <label htmlFor="category" className="form-label small fw-semibold text-dark">
                  {t("teacher.categoryLabel")} <span className="text-danger">*</span>
                </label>
                <select
                  id="category"
                  className={`form-select ${errors.category ? "is-invalid" : ""}`}
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={saving}
                  required
                >
                  {EVENT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {t(`events.categories.${cat}`) !== `events.categories.${cat}`
                        ? t(`events.categories.${cat}`)
                        : cat}
                    </option>
                  ))}
                </select>
                {errors.category && <div className="invalid-feedback small">{t(errors.category)}</div>}
              </div>

              <div className="col-sm-6">
                <label htmlFor="location" className="form-label small fw-semibold text-dark">
                  {t("teacher.locationLabel")} <span className="text-danger">*</span>
                </label>
                <input
                  id="location"
                  type="text"
                  className={`form-control ${errors.location ? "is-invalid" : ""}`}
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  disabled={saving}
                  required
                />
                {errors.location && <div className="invalid-feedback small">{t(errors.location)}</div>}
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-sm-4">
                <label htmlFor="eventDate" className="form-label small fw-semibold text-dark">
                  {t("teacher.dateLabel")} <span className="text-danger">*</span>
                </label>
                <input
                  id="eventDate"
                  type="date"
                  className={`form-control ${errors.eventDate ? "is-invalid" : ""}`}
                  value={formData.eventDate}
                  onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                  disabled={saving}
                  required
                />
                {errors.eventDate && <div className="invalid-feedback small">{t(errors.eventDate)}</div>}
              </div>

              <div className="col-sm-4">
                <label htmlFor="startTime" className="form-label small fw-semibold text-dark">
                  {t("teacher.startLabel")} <span className="text-danger">*</span>
                </label>
                <input
                  id="startTime"
                  type="time"
                  className={`form-control ${errors.startTime ? "is-invalid" : ""}`}
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  disabled={saving}
                  required
                />
                {errors.startTime && <div className="invalid-feedback small">{t(errors.startTime)}</div>}
              </div>

              <div className="col-sm-4">
                <label htmlFor="endTime" className="form-label small fw-semibold text-dark">
                  {t("teacher.endLabel")} <span className="text-danger">*</span>
                </label>
                <input
                  id="endTime"
                  type="time"
                  className={`form-control ${errors.endTime ? "is-invalid" : ""}`}
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  disabled={saving}
                  required
                />
                {errors.endTime && <div className="invalid-feedback small">{t(errors.endTime)}</div>}
              </div>
            </div>

            <div className="row g-3 mb-3">
              <div className="col-sm-6">
                <label htmlFor="ticketPrice" className="form-label small fw-semibold text-dark">
                  {t("teacher.priceLabel")} <span className="text-danger">*</span>
                </label>
                <input
                  id="ticketPrice"
                  type="number"
                  step="0.5"
                  min="0"
                  className={`form-control ${errors.ticketPrice ? "is-invalid" : ""}`}
                  value={formData.ticketPrice}
                  onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.value })}
                  disabled={saving}
                  required
                />
                <div className="form-text small">{t("teacher.priceHelp")}</div>
                {errors.ticketPrice && <div className="invalid-feedback small">{t(errors.ticketPrice)}</div>}
              </div>

              <div className="col-sm-6">
                <label htmlFor="capacity" className="form-label small fw-semibold text-dark">
                  {t("teacher.capacityLabel")} <span className="text-danger">*</span>
                </label>
                <input
                  id="capacity"
                  type="number"
                  min="1"
                  className={`form-control ${errors.capacity ? "is-invalid" : ""}`}
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  disabled={saving}
                  required
                />
                {errors.capacity && <div className="invalid-feedback small">{t(errors.capacity)}</div>}
              </div>
            </div>

            <div className="mb-3">
              <label htmlFor="imageUrl" className="form-label small fw-semibold text-dark">
                {t("teacher.imageLabel")}
              </label>
              <input
                id="imageUrl"
                type="url"
                className={`form-control ${errors.imageUrl ? "is-invalid" : ""}`}
                placeholder="https://images.unsplash.com/..."
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                disabled={saving}
              />
              {errors.imageUrl && <div className="invalid-feedback small">{t(errors.imageUrl)}</div>}

              {formData.imageUrl && (
                <div className="mt-3 p-2 border rounded bg-light">
                  <div className="small text-secondary mb-1">{t("teacher.imagePreview")}</div>
                  <div style={{ maxHeight: "200px", overflow: "hidden", borderRadius: "6px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={formData.imageUrl}
                      alt="Preview"
                      className="w-100 object-fit-cover"
                      style={{ height: "180px" }}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="description" className="form-label small fw-semibold text-dark">
                {t("teacher.descriptionLabel")}
              </label>
              <textarea
                id="description"
                rows={4}
                className="form-control"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={saving}
              />
            </div>

            <div className="d-flex justify-content-end gap-2">
              <Link href="/dashboard/teacher/events" className="btn btn-outline-secondary">
                {t("common.cancel")}
              </Link>
              <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                {saving ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    {t("teacher.saving")}
                  </>
                ) : (
                  <>
                    <i className="bi bi-check-lg me-1"></i>
                    {t("teacher.saveDraft")}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </RoleGuard>
  );
}

