/**
 * Types that mirror the EventFlow REST contract (docs/API_CONTRACT.md).
 * Field names are kept EXACTLY as returned by the backend
 * (verified against the running API on http://localhost:2525).
 */

export type Role = "ADMIN" | "ENSEIGNANT" | "ETUDIANT";
export type RegistrableRole = Exclude<Role, "ADMIN">;
export type UserStatus = "EN_ATTENTE" | "ACTIF" | "REFUSE" | "DESACTIVE";

/** Event status values observed on the real API. */
export type EventStatus = "BROUILLON" | "PUBLIE" | "COMPLET" | "ANNULE";

export type ReservationStatus = "EN_ATTENTE" | "CONFIRMEE" | "ANNULEE";
export type PaymentStatus = "EN_ATTENTE" | "PAYE" | "ECHOUE" | "REMBOURSE";
export type PaymentMethod = "CARTE_SIMULEE" | "VIREMENT_SIMULE";
/** Value returned by the ticket endpoint for free events. */
export type TicketPaymentMethod = PaymentMethod | "GRATUIT";
export type PayResultStatus = "PAYE" | "ECHOUE";

// ---------------------------------------------------------------- errors

export interface ApiErrorBody {
  timestamp?: string;
  status: number;
  message: string;
  code: string;
  path?: string;
  /** Documented location of field errors. */
  details?: { fields?: Record<string, string> } & Record<string, unknown>;
  /** Location actually used by the running backend for field errors. */
  fields?: Record<string, string>;
}

// ---------------------------------------------------------------- users / auth

export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface RegisterRequest {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: RegistrableRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ValidateUserRequest {
  role: RegistrableRole;
}

export interface UpdateUserStatusRequest {
  status: Extract<UserStatus, "ACTIF" | "DESACTIVE">;
}

// ---------------------------------------------------------------- events

export interface EventTeacher {
  id: number;
  fullName: string;
}

export interface EventAction {
  id: number;
  eventId?: number;
  title: string;
  description: string | null;
  actionDate: string;
  startTime: string;
  endTime: string;
  displayOrder: number;
}

export interface EventItem {
  id: number;
  title: string;
  description: string | null;
  category: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  imageUrl: string | null;
  ticketPrice: number;
  capacity: number;
  availablePlaces: number;
  status: EventStatus;
  teacherId?: number;
  teacher: EventTeacher | null;
  actions: EventAction[];
  createdAt?: string;
  updatedAt?: string;
}

export interface EventFilterQuery {
  search?: string;
  category?: string;
  date?: string;
  availableOnly?: boolean;
}

export interface EventRequest {
  title: string;
  description: string;
  category: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  location: string;
  imageUrl: string;
  ticketPrice: number;
  capacity: number;
}

export interface EventActionRequest {
  title: string;
  description: string;
  actionDate: string;
  startTime: string;
  endTime: string;
}

export interface DeleteEventResponse {
  deleted: boolean;
  message: string;
  status: string | null;
}

export interface Participant {
  reservationId: number;
  studentId: number;
  firstName: string;
  lastName: string;
  email: string;
  reservationDate: string;
  reservationStatus: ReservationStatus;
  numberOfPlaces: number;
  confirmationCode: string | null;
  paymentStatus: PaymentStatus | null;
}

// ---------------------------------------------------------------- reservations

export interface ReservationRequest {
  eventId: number;
  numberOfPlaces: number;
  paymentMethod: PaymentMethod;
}

export interface Reservation {
  id: number;
  eventId: number;
  eventTitle: string;
  numberOfPlaces: number;
  amount: number;
  status: ReservationStatus;
  confirmationCode: string | null;
  paymentId: number | null;
  paymentStatus: PaymentStatus | null;
  reservationDate: string;
}

export interface PayRequest {
  status: PayResultStatus;
}

export interface PaymentResult {
  paymentId: number;
  reservationId: number;
  eventId: number;
  paymentStatus: PaymentStatus;
  reservationStatus: ReservationStatus;
  confirmationCode: string | null;
  amount: number;
  method: PaymentMethod;
  reference: string;
  paymentDate: string;
}

export interface Ticket {
  paymentId: number;
  reservationId: number;
  eventTitle: string;
  eventDate: string;
  location: string;
  studentName: string;
  amount: number;
  paymentMethod: TicketPaymentMethod;
  paymentReference: string;
  paymentDate: string;
  reservationCode: string;
  generatedAt: string;
}

// ---------------------------------------------------------------- notifications

export interface AppNotification {
  id: number;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export interface ReadAllResponse {
  updatedCount: number;
}

// ---------------------------------------------------------------- dashboards

export interface AdminDashboard {
  usersByRole: Partial<Record<Role, number>>;
  usersByStatus: Partial<Record<UserStatus, number>>;
  eventCount: number;
  reservationCount: number;
  simulatedRevenue: number;
}

export interface TeacherEventStats {
  eventId: number;
  title: string;
  eventDate: string;
  status: EventStatus;
  capacity: number;
  placesSold: number;
  fillRatePercent: number;
  revenue: number;
}

export interface TeacherDashboard {
  publishedEventCount: number;
  placesSold: number;
  fillRatePercent: number;
  totalRevenue: number;
  events: TeacherEventStats[];
}

export interface StudentDashboardEvent {
  reservationId: number;
  eventId: number;
  eventTitle: string;
  eventDate: string;
  location: string;
  numberOfPlaces: number;
  reservationStatus: ReservationStatus;
  confirmationCode: string | null;
  paymentStatus: PaymentStatus | null;
  amount: number;
}

export interface StudentDashboard {
  confirmedReservationCount: number;
  paymentCount: number;
  paidAmount: number;
  upcomingEvents: StudentDashboardEvent[];
  pastEvents: StudentDashboardEvent[];
}

// ---------------------------------------------------------------- history

export interface HistoryEntry {
  id: number;
  userId: number;
  actionType: string;
  entityType: string;
  entityId: number;
  description: string;
  createdAt: string;
}

