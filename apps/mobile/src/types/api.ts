/**
 * Shared API response types — mirrors the backend's apiResponse.ts shape
 * and Prisma enum types for type-safe mobile ↔ server communication.
 */

// ─── Generic API Envelope ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ─── Prisma-mirrored Enums ───────────────────────────────────────────────────

export type UserRole = 'ADMIN' | 'SUPERVISOR' | 'DRIVER' | 'CITIZEN';

export type StopStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED' | 'BACKLOGGED';

export type SkipReason = 'WASTE_MIXED' | 'TRUCK_FULL' | 'INACCESSIBLE' | 'OTHER';

export type BinType = 'WET' | 'DRY' | 'MIXED';

export type Shift = 'AM' | 'PM';

export type VehicleStatus = 'IDLE' | 'EN_ROUTE' | 'COLLECTING' | 'FULL' | 'RETURNING_TO_DEPOT';

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  name: string;
  role: UserRole;
  mobile: string | null;
  ward_id: string | null;
  society_id: string | null;   // populated for CITIZEN role
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface OtpRequestResponse {
  otp: string;     // only returned in dev mode
  message: string;
}

// ─── Route & Stop ────────────────────────────────────────────────────────────

export interface StopPhoto {
  id: string;
  url: string;
  geofence_valid: boolean;
}

export interface Stop {
  id: string;
  route_id: string;
  society_id: string;
  address: string;
  lat: number;
  lng: number;
  bin_type: BinType;
  sequence_order: number;
  status: StopStatus;
  skip_reason: SkipReason | null;
  skip_notes: string | null;
  completed_at: string | null;
  skipped_at: string | null;
  society: {
    name: string;
    address: string;
  };
  photos: StopPhoto[];
}

export interface Vehicle {
  id: string;
  registration_no: string;
  capacity_kg: number;
  vehicle_type: string;
  current_load_kg?: number;
  load_percent?: number;
  last_update?: string | null;
  status?: VehicleStatus;
}

export interface RouteProgress {
  total: number;
  completed: number;
  skipped: number;
  pending: number;
  percentage: number;
}

export interface RouteData {
  id: string;
  ward_id: string;
  vehicle_id: string;
  driver_id: string;
  supervisor_id: string | null;
  shift: Shift;
  date: string;
  is_active: boolean;
  vehicle: Vehicle;
  stops: Stop[];
  ward: { name: string };
  supervisor: { id: string; name: string; mobile: string } | null;
  progress: RouteProgress;
}

// ─── Society Status ──────────────────────────────────────────────────────────

export interface SocietyStatusResponse {
  society: {
    id: string;
    name: string;
    address: string;
    wallet_balance: number;
  };
  today: {
    stop_id: string;
    status: StopStatus;
    bin_type: BinType;
    skip_reason: SkipReason | null;
    completed_at: string | null;
    skipped_at: string | null;
    driver_name: string;
    vehicle: {
      registration_no: string;
      position: { lat: number; lng: number } | null;
      load_percent: number;
    };
  } | null;
}

// ─── Notification ────────────────────────────────────────────────────────────

export interface Notification {
  id: string;
  target_user_id: string | null;
  target_society_id: string | null;
  type: string;
  title: string;
  body: string;
  sent_at: string;
  read_at: string | null;
}
