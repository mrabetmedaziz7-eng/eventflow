"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { teacherApi } from "@/lib/api";
import type { EventItem, EventAction, EventActionRequest } from "@/types/api";
import {
  validateEvent,
  toEventRequest,
  validateAction,
  hasErrors,
  type FieldErrors,
  type EventFormValues,
} from "@/lib/validation";
import { sortActions, EVENT_CATEGORIES } from "@/lib/events";
import { errorMessage, apiFieldErrors } from "@/lib/errors";
import RoleGuard from "@/components/common/RoleGuard";

export default function EditEventPage() {
  const params = useParams();
  const eventId = Number(params.id);
  const router = useRouter();
  const { t, lang, formatTime } = useI18n();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [event, setEvent] = useState<EventItem | null>(null);

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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Program / Actions state
  const [actions, setActions] = useState<EventAction[]>([]);
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState<EventAction | null>(null);
  const [actionForm, setActionForm] = useState<EventActionRequest>({
    title: "",
    description: "",
    actionDate: "",
    startTime: "09:00",
    endTime: "10:00",
  });
  const [actionErrors, setActionErrors] = useState<FieldErrors>({});
  const [actionSaving, setActionSaving] = useState(false);

  const fetchEventData = async () => {
    setLoading(true);
    setGlobalError(null);
    try {
      const data = await teacherApi.event(eventId);
      setEvent(data);
      setFormData({
        title: data.title,
        description: data.description || "",
        category: data.category,
        eventDate: data.eventDate,
        startTime: data.startTime.slice(0, 5),
        endTime: data.endTime.slice(0, 5),
        location: data.location,
        imageUrl: data.imageUrl || "",
        ticketPrice: String(data.ticketPrice),
        capacity: String(data.capacity),
      });

      // Fetch actions
      const actList = await teacherApi.actions(eventId);
      setActions(sortActions(actList));
    } catch (err: unknown) {
      setGlobalError(errorMessage(err, lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (eventId) {
      fetchEventData();
    }
  }, [eventId]);

  const handleEventSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    setSuccessMessage(null);

    const clientErrors = validateEvent(formData);
    if (hasErrors(clientErrors)) {
      setErrors(clientErrors);
      return;
    }
    setErrors({});
    setSaving(true);

    try {
      const payload = toEventRequest(formData);
      const updated = await teacherApi.update(eventId, payload);
      setEvent(updated);
      setSuccessMessage(t("teacher.savedSuccess"));
    } catch (err: unknown) {
      setGlobalError(errorMessage(err, lang));
      setErrors(apiFieldErrors(err, lang));
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm(t("teacher.publishConfirm"))) return;
    setSaving(true);
    setGlobalError(null);
    try {
      await teacherApi.publish(eventId);
      router.push("/dashboard/teacher/events");
    } catch (err: unknown) {
      setGlobalError(errorMessage(err, lang));
    } finally {
      setSaving(false);
    }
  };

  // Action methods
  const openAddActionModal = () => {
    setEditingAction(null);
    setActionForm({
      title: "",
      description: "",
      actionDate: formData.eventDate,
      startTime: "09:00",
      endTime: "10:00",
    });
    setActionErrors({});
    setShowActionModal(true);
  };

  const openEditActionModal = (act: EventAction) => {
    setEditingAction(act);
    setActionForm({
      title: act.title,
      description: act.description || "",
      actionDate: act.actionDate,
      startTime: act.startTime.slice(0, 5),
      endTime: act.endTime.slice(0, 5),
    });
    setActionErrors({});
    setShowActionModal(true);
  };

  const handleActionSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const clientErrors = validateAction(actionForm);
    if (hasErrors(clientErrors)) {
      setActionErrors(clientErrors);
      return;
    }
    setActionErrors({});
    setActionSaving(true);

    try {
      if (editingAction) {
        await teacherApi.updateAction(eventId, editingAction.id, actionForm);
      } else {
        await teacherApi.addAction(eventId, actionForm);
      }
      setShowActionModal(false);
      const actList = await teacherApi.actions(eventId);
      setActions(sortActions(actList));
    } catch (err: unknown) {
      setGlobalError(errorMessage(err, lang));
    } finally {
      setActionSaving(false);
    }
  };

  const handleDeleteAction = async (actionId: number) => {
    if (!confirm(t("teacher.deleteActionConfirm"))) return;
    try {
      await teacherApi.deleteAction(eventId, actionId);
      const actList = await teacherApi.actions(eventId);
      setActions(sortActions(actList));
    } catch (err: unknown) {
      setGlobalError(errorMessage(err, lang));
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50 py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <RoleGuard allowedRoles={["ENSEIGNANT"]}>
      <div className="container py-5" style={{ maxWidth: "880px" }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <Link href="/dashboard/teacher/events" className="btn btn-outline-secondary btn-sm mb-2">
              <i className="bi bi-arrow-left me-1 ef-flip-rtl"></i>
              {t("teacher.myEventsTitle")}
            </Link>
            <h1 className="h3 fw-bold text-dark mb-1">{t("teacher.formEditTitle")}</h1>
            <span
              className={`badge ${
                event?.status === "PUBLIE"
                  ? "ef-badge-available"
                  : event?.status === "BROUILLON"
                  ? "ef-badge-pending"
                  : "ef-badge-danger"
              }`}
            >
              {event?.status}
            </span>
          </div>

          {event?.status === "BROUILLON" && (
            <button onClick={handlePublish} className="btn btn-success px-4" disabled={saving}>
              <i className="bi bi-send me-1"></i>
              {t("teacher.publishButton")}
            </button>
          )}
        </div>

        {successMessage && (
          <div className="alert alert-success alert-dismissible fade show py-2 small mb-4" role="alert">
            <i className="bi bi-check-circle-fill me-1"></i>
            {successMessage}
            <button type="button" className="btn-close py-2" onClick={() => setSuccessMessage(null)}></button>
          </div>
        )}

        {globalError && (
          <div className="alert alert-danger py-2 small mb-4" role="alert">
            <i className="bi bi-x-circle-fill me-1"></i>
            {globalError}
          </div>
        )}

        {/* Edit Form */}
        <div className="card ef-card p-4 p-md-5 border-0 shadow-sm mb-5">
          <form onSubmit={handleEventSubmit} noValidate>
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
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                disabled={saving}
              />
              {errors.imageUrl && <div className="invalid-feedback small">{t(errors.imageUrl)}</div>}
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

            <div className="d-flex justify-content-end">
              <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                {saving ? t("teacher.saving") : t("common.save")}
              </button>
            </div>
          </form>
        </div>

        {/* Event Program / Actions Management */}
        <div className="card ef-card p-4 p-md-5 border-0 shadow-sm">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="h5 fw-bold text-dark mb-0 d-flex align-items-center gap-2">
              <i className="bi bi-list-check text-primary"></i>
              {t("teacher.programTitle")}
            </h2>
            <button onClick={openAddActionModal} className="btn btn-outline-primary btn-sm">
              <i className="bi bi-plus-lg me-1"></i>
              {t("teacher.addAction")}
            </button>
          </div>

          {actions.length === 0 ? (
            <div className="text-center py-4 text-secondary small">
              {t("events.detail.noProgram")}
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {actions.map((act) => (
                <div
                  key={act.id}
                  className="list-group-item d-flex justify-content-between align-items-start px-0 py-3"
                >
                  <div>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <span className="badge bg-light text-primary border small">
                        {formatTime(act.startTime)} - {formatTime(act.endTime)}
                      </span>
                      <span className="fw-semibold text-dark">{act.title}</span>
                    </div>
                    {act.description && <p className="text-secondary small mb-0">{act.description}</p>}
                  </div>
                  <div className="btn-group btn-group-sm">
                    <button
                      onClick={() => openEditActionModal(act)}
                      className="btn btn-outline-secondary"
                      title={t("common.edit")}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button
                      onClick={() => handleDeleteAction(act.id)}
                      className="btn btn-outline-danger"
                      title={t("common.delete")}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Modal */}
        {showActionModal && (
          <div className="modal show d-block bg-dark bg-opacity-50" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 ef-card shadow">
                <form onSubmit={handleActionSubmit} noValidate>
                  <div className="modal-header">
                    <h5 className="modal-title fw-bold text-dark">
                      {editingAction ? t("teacher.saveAction") : t("teacher.addAction")}
                    </h5>
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setShowActionModal(false)}
                    ></button>
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label small fw-semibold text-dark">
                        {t("teacher.actionTitleLabel")} <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className={`form-control ${actionErrors.title ? "is-invalid" : ""}`}
                        value={actionForm.title}
                        onChange={(e) => setActionForm({ ...actionForm, title: e.target.value })}
                        required
                      />
                      {actionErrors.title && (
                        <div className="invalid-feedback small">{t(actionErrors.title)}</div>
                      )}
                    </div>

                    <div className="row g-2 mb-3">
                      <div className="col-4">
                        <label className="form-label small fw-semibold text-dark">
                          {t("teacher.actionDateLabel")}
                        </label>
                        <input
                          type="date"
                          className="form-control"
                          value={actionForm.actionDate}
                          onChange={(e) => setActionForm({ ...actionForm, actionDate: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-4">
                        <label className="form-label small fw-semibold text-dark">
                          {t("teacher.actionStartLabel")}
                        </label>
                        <input
                          type="time"
                          className="form-control"
                          value={actionForm.startTime}
                          onChange={(e) => setActionForm({ ...actionForm, startTime: e.target.value })}
                          required
                        />
                      </div>
                      <div className="col-4">
                        <label className="form-label small fw-semibold text-dark">
                          {t("teacher.actionEndLabel")}
                        </label>
                        <input
                          type="time"
                          className={`form-control ${actionErrors.endTime ? "is-invalid" : ""}`}
                          value={actionForm.endTime}
                          onChange={(e) => setActionForm({ ...actionForm, endTime: e.target.value })}
                          required
                        />
                        {actionErrors.endTime && (
                          <div className="invalid-feedback small">{t(actionErrors.endTime)}</div>
                        )}
                      </div>
                    </div>

                    <div className="mb-2">
                      <label className="form-label small fw-semibold text-dark">
                        {t("teacher.actionDescLabel")}
                      </label>
                      <textarea
                        rows={2}
                        className="form-control"
                        value={actionForm.description}
                        onChange={(e) => setActionForm({ ...actionForm, description: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowActionModal(false)}
                    >
                      {t("common.cancel")}
                    </button>
                    <button type="submit" className="btn btn-primary" disabled={actionSaving}>
                      {actionSaving ? t("teacher.saving") : t("teacher.saveAction")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleGuard>
  );
}

