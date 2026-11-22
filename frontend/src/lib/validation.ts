/**
 * Client-side validation (better UX only; the backend remains the authority).
 * Every function returns a map field -> translation key (empty map = valid).
 * Rules mirror the constraints observed on the real API:
 *  - email must be valid, password 8..72 characters, names not blank
 *  - capacity > 0, ticketPrice >= 0, endTime after startTime (EVENT_VALIDATION_ERROR)
 */
import type { EventActionRequest, EventRequest, RegistrableRole } from "@/types/api";

export type FieldErrors = Record<string, string>;

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}(:\d{2})?$/;

export function isBlank(value: string | null | undefined): boolean {
  return !value || value.trim().length === 0;
}

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/** "09:00" or "09:00:00" -> minutes since midnight. */
export function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function checkPassword(value: string, field: string, errors: FieldErrors) {
  if (isBlank(value)) errors[field] = "validation.required";
  else if (value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) errors[field] = "validation.passwordLength";
}

export function validateLogin(values: { email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(values.email)) errors.email = "validation.required";
  else if (!isValidEmail(values.email)) errors.email = "validation.email";
  if (isBlank(values.password)) errors.password = "validation.required";
  return errors;
}

export interface RegisterValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: RegistrableRole | "";
}

export function validateRegister(values: RegisterValues): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(values.firstName)) errors.firstName = "validation.required";
  if (isBlank(values.lastName)) errors.lastName = "validation.required";
  if (isBlank(values.email)) errors.email = "validation.required";
  else if (!isValidEmail(values.email)) errors.email = "validation.email";
  checkPassword(values.password, "password", errors);
  if (!errors.password && values.confirmPassword !== values.password) errors.confirmPassword = "validation.passwordMatch";
  if (values.role !== "ETUDIANT" && values.role !== "ENSEIGNANT") errors.role = "validation.role";
  return errors;
}

export function validateProfile(values: { firstName: string; lastName: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(values.firstName)) errors.firstName = "validation.required";
  if (isBlank(values.lastName)) errors.lastName = "validation.required";
  return errors;
}

export function validatePasswordChange(values: { currentPassword: string; newPassword: string; confirmPassword: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(values.currentPassword)) errors.currentPassword = "validation.required";
  checkPassword(values.newPassword, "newPassword", errors);
  if (!errors.newPassword && values.confirmPassword !== values.newPassword) errors.confirmPassword = "validation.passwordMatch";
  return errors;
}

/** Form values are strings (inputs); converted to EventRequest after validation. */
export interface EventFormValues {
  title: string;
  description: string;
  category: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  imageUrl: string;
  ticketPrice: string;
  capacity: string;
}

export function isValidHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateEvent(values: EventFormValues): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(values.title)) errors.title = "validation.required";
  if (isBlank(values.category)) errors.category = "validation.required";
  if (isBlank(values.location)) errors.location = "validation.required";
  if (!DATE_RE.test(values.eventDate)) errors.eventDate = "validation.required";
  if (!TIME_RE.test(values.startTime)) errors.startTime = "validation.required";
  if (!TIME_RE.test(values.endTime)) errors.endTime = "validation.required";
  else if (!errors.startTime && timeToMinutes(values.endTime) <= timeToMinutes(values.startTime)) {
    errors.endTime = "validation.endAfterStart";
  }
  if (!isBlank(values.imageUrl) && !isValidHttpUrl(values.imageUrl.trim())) errors.imageUrl = "validation.url";

  const price = Number(values.ticketPrice);
  if (isBlank(values.ticketPrice)) errors.ticketPrice = "validation.required";
  else if (!Number.isFinite(price) || price < 0) errors.ticketPrice = "validation.priceMin";

  const capacity = Number(values.capacity);
  if (isBlank(values.capacity)) errors.capacity = "validation.required";
  else if (!Number.isInteger(capacity) || capacity <= 0) errors.capacity = "validation.capacityMin";
  return errors;
}

export function toEventRequest(values: EventFormValues): EventRequest {
  return {
    title: values.title.trim(),
    description: values.description.trim(),
    category: values.category,
    eventDate: values.eventDate,
    startTime: values.startTime.slice(0, 5),
    endTime: values.endTime.slice(0, 5),
    location: values.location.trim(),
    imageUrl: values.imageUrl.trim(),
    ticketPrice: Number(values.ticketPrice),
    capacity: Number(values.capacity),
  };
}

export function validateAction(values: EventActionRequest): FieldErrors {
  const errors: FieldErrors = {};
  if (isBlank(values.title)) errors.title = "validation.required";
  if (!DATE_RE.test(values.actionDate)) errors.actionDate = "validation.required";
  if (!TIME_RE.test(values.startTime)) errors.startTime = "validation.required";
  if (!TIME_RE.test(values.endTime)) errors.endTime = "validation.required";
  else if (!errors.startTime && timeToMinutes(values.endTime) <= timeToMinutes(values.startTime)) {
    errors.endTime = "validation.endAfterStart";
  }
  return errors;
}

export function validatePlaces(numberOfPlaces: number, availablePlaces: number): string | null {
  if (!Number.isInteger(numberOfPlaces) || numberOfPlaces < 1) return "validation.placesMin";
  if (numberOfPlaces > availablePlaces) return "validation.placesMax";
  return null;
}

export function hasErrors(errors: FieldErrors): boolean {
  return Object.keys(errors).length > 0;
}

