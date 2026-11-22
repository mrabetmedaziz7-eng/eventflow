/**
 * Central API client. Every HTTP call to the backend goes through `apiRequest`.
 * - Base URL from NEXT_PUBLIC_API_URL (default http://localhost:2525)
 * - Adds `Authorization: Bearer <token>` automatically
 * - Parses the backend error format into a typed `ApiError`
 * - On 401 (expired / invalid session) clears the session and notifies the app
 */
import type {
  AdminDashboard,
  ApiErrorBody,
  AppNotification,
  ChangePasswordRequest,
  DeleteEventResponse,
  EventAction,
  EventActionRequest,
  EventFilterQuery,
  EventItem,
  EventRequest,
  HistoryEntry,
  LoginRequest,
  LoginResponse,
  Participant,
  PaymentResult,
  PayResultStatus,
  ReadAllResponse,
  RegisterRequest,
  Reservation,
  ReservationRequest,
  StudentDashboard,
  TeacherDashboard,
  Ticket,
  UpdateProfileRequest,
  UpdateUserStatusRequest,
  User,
  ValidateUserRequest,
} from "@/types/api";

export const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:2525").replace(/\/+$/, "");

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly path?: string;
  readonly fields: Record<string, string>;

  constructor(status: number, code: string, message: string, fields: Record<string, string> = {}, path?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
    this.path = path;
  }
}

/** Code used when the backend cannot be reached at all. */
export const NETWORK_ERROR = "NETWORK_ERROR";

// ---------------------------------------------------------------- token store (memory)

let memoryToken: string | null = null;
let unauthorizedHandler: (() => void) | null = null;

export function setApiToken(token: string | null): void {
  memoryToken = token;
}

export function getApiToken(): string | null {
  return memoryToken;
}

/** Registered by the AuthProvider: called when the backend answers 401 on an authenticated call. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

// ---------------------------------------------------------------- core request

type Query = Record<string, string | number | boolean | undefined | null>;

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Query;
  /** Send the bearer token (default true). */
  auth?: boolean;
  /** Do not trigger the global 401 handler (used by the login call). */
  skipUnauthorizedHandler?: boolean;
  signal?: AbortSignal;
}

function buildUrl(path: string, query?: Query): string {
  const url = new URL(API_BASE_URL + path);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function defaultCodeForStatus(status: number): string {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "RESOURCE_NOT_FOUND";
    case 409:
      return "CONFLICT";
    default:
      return status >= 500 ? "SERVER_ERROR" : "UNKNOWN_ERROR";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toStringRecord(value: unknown): Record<string, string> {
  const result: Record<string, string> = {};
  if (!isRecord(value)) return result;
  for (const [key, v] of Object.entries(value)) {
    if (typeof v === "string") result[key] = v;
    else if (Array.isArray(v)) result[key] = v.map(String).join(" ");
    else if (v !== null && v !== undefined) result[key] = String(v);
  }
  return result;
}

/** Converts a raw response body into an ApiError (handles empty bodies). */
export function parseApiError(status: number, body: unknown): ApiError {
  if (isRecord(body)) {
    const b = body as Partial<ApiErrorBody>;
    const fields = {
      ...toStringRecord(isRecord(b.details) ? b.details.fields : undefined),
      ...toStringRecord(b.fields),
    };
    return new ApiError(
      typeof b.status === "number" ? b.status : status,
      typeof b.code === "string" && b.code ? b.code : defaultCodeForStatus(status),
      typeof b.message === "string" ? b.message : "",
      fields,
      typeof b.path === "string" ? b.path : undefined,
    );
  }
  return new ApiError(status, defaultCodeForStatus(status), "");
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, query, auth = true, skipUnauthorizedHandler = false, signal } = options;
  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  const token = memoryToken;
  if (auth && token) headers.Authorization = `Bearer ${token}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(0, NETWORK_ERROR, "");
  }

  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!response.ok) {
    const error = parseApiError(response.status, data);
    // A 401 on an authenticated call means the session is no longer valid.
    // Exception: the backend also answers 401 INVALID_CREDENTIALS when the
    // current password is wrong on the change-password call; the token is still valid there.
    if (
      response.status === 401 &&
      auth &&
      token &&
      !skipUnauthorizedHandler &&
      error.code !== "INVALID_CREDENTIALS" &&
      unauthorizedHandler
    ) {
      unauthorizedHandler();
    }
    throw error;
  }
  return data as T;
}

// ---------------------------------------------------------------- endpoints

export const authApi = {
  register: (body: RegisterRequest) => apiRequest<User>("/api/auth/register", { method: "POST", body, auth: false }),
  login: (body: LoginRequest) =>
    apiRequest<LoginResponse>("/api/auth/login", { method: "POST", body, auth: false, skipUnauthorizedHandler: true }),
};

export const usersApi = {
  me: () => apiRequest<User>("/api/users/me"),
  updateMe: (body: UpdateProfileRequest) => apiRequest<User>("/api/users/me", { method: "PUT", body }),
  changePassword: (body: ChangePasswordRequest) =>
    apiRequest<unknown>("/api/users/me/password", { method: "PATCH", body }),
};

export const adminApi = {
  users: () => apiRequest<User[]>("/api/admin/users"),
  pending: () => apiRequest<User[]>("/api/admin/users/pending"),
  validate: (id: number, body: ValidateUserRequest) =>
    apiRequest<User>(`/api/admin/users/${id}/validate`, { method: "PATCH", body }),
  reject: (id: number) => apiRequest<User>(`/api/admin/users/${id}/reject`, { method: "PATCH" }),
  setStatus: (id: number, body: UpdateUserStatusRequest) =>
    apiRequest<User>(`/api/admin/users/${id}/status`, { method: "PATCH", body }),
};

export const eventsApi = {
  list: (filters: EventFilterQuery = {}) =>
    apiRequest<EventItem[]>("/api/events", {
      auth: false,
      query: {
        search: filters.search?.trim(),
        category: filters.category,
        date: filters.date,
        availableOnly: filters.availableOnly ? true : undefined,
      },
    }),
  get: (id: number) => apiRequest<EventItem>(`/api/events/${id}`, { auth: false }),
};

export const teacherApi = {
  events: () => apiRequest<EventItem[]>("/api/teacher/events"),
  event: (id: number) => apiRequest<EventItem>(`/api/teacher/events/${id}`),
  create: (body: EventRequest) => apiRequest<EventItem>("/api/teacher/events", { method: "POST", body }),
  update: (id: number, body: EventRequest) => apiRequest<EventItem>(`/api/teacher/events/${id}`, { method: "PUT", body }),
  remove: (id: number) => apiRequest<DeleteEventResponse>(`/api/teacher/events/${id}`, { method: "DELETE" }),
  publish: (id: number) => apiRequest<EventItem>(`/api/teacher/events/${id}/publish`, { method: "PATCH" }),
  cancel: (id: number) => apiRequest<EventItem>(`/api/teacher/events/${id}/cancel`, { method: "PATCH" }),
  actions: (id: number) => apiRequest<EventAction[]>(`/api/teacher/events/${id}/actions`),
  addAction: (id: number, body: EventActionRequest) =>
    apiRequest<EventAction>(`/api/teacher/events/${id}/actions`, { method: "POST", body }),
  updateAction: (id: number, actionId: number, body: EventActionRequest) =>
    apiRequest<EventAction>(`/api/teacher/events/${id}/actions/${actionId}`, { method: "PUT", body }),
  deleteAction: (id: number, actionId: number) =>
    apiRequest<unknown>(`/api/teacher/events/${id}/actions/${actionId}`, { method: "DELETE" }),
  participants: (id: number) => apiRequest<Participant[]>(`/api/teacher/events/${id}/participants`),
  removeParticipant: (id: number, studentId: number) =>
    apiRequest<unknown>(`/api/teacher/events/${id}/participants/${studentId}`, { method: "DELETE" }),
};

export const reservationsApi = {
  create: (body: ReservationRequest) => apiRequest<Reservation>("/api/reservations", { method: "POST", body }),
  mine: () => apiRequest<Reservation[]>("/api/reservations/me"),
  pay: (id: number, status: PayResultStatus) =>
    apiRequest<PaymentResult>(`/api/reservations/${id}/pay`, { method: "POST", body: { status } }),
  ticket: (id: number) => apiRequest<Ticket>(`/api/reservations/${id}/ticket`),
  cancel: (id: number) => apiRequest<Reservation>(`/api/reservations/${id}/cancel`, { method: "POST" }),
};

export const notificationsApi = {
  list: () => apiRequest<AppNotification[]>("/api/notifications"),
  markRead: (id: number) => apiRequest<AppNotification>(`/api/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => apiRequest<ReadAllResponse>("/api/notifications/read-all", { method: "PATCH" }),
};

export const dashboardApi = {
  admin: () => apiRequest<AdminDashboard>("/api/dashboard/admin"),
  teacher: () => apiRequest<TeacherDashboard>("/api/dashboard/teacher"),
  student: () => apiRequest<StudentDashboard>("/api/dashboard/student"),
};

export const historyApi = {
  list: () => apiRequest<HistoryEntry[]>("/api/history"),
};

