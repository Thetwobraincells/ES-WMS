import { apiRequest } from "@/services/api";

export type Shift = "AM" | "PM";
export type BinType = "WET" | "DRY" | "MIXED";
export type StopStatus = "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "BACKLOGGED";

export type RouteRecord = {
  id: string;
  ward_id: string;
  vehicle_id: string;
  driver_id: string;
  supervisor_id?: string | null;
  shift: Shift;
  date?: string;
  is_active: boolean;
  ward?: { name: string };
  vehicle?: { registration_no: string };
  driver?: { name: string };
  supervisor?: { name: string } | null;
  _count?: { stops: number };
};

export type RouteStop = {
  id: string;
  sequence_order: number;
  address: string;
  lat: number;
  lng: number;
  bin_type: BinType;
  status: StopStatus;
  society_id: string | null;
  society?: { name: string; address: string } | null;
  skip_reason?: string | null;
};

export type RouteDetails = RouteRecord & {
  stops: RouteStop[];
  progress?: {
    total: number;
    completed: number;
    skipped: number;
    pending: number;
    percentage: number;
  };
};

type RoutePayload = {
  ward_id: string;
  vehicle_id: string;
  driver_id: string;
  supervisor_id?: string;
  shift: Shift;
  date?: string;
  is_active?: boolean;
  stops?: Array<{
    id?: string;
    society_id?: string | null;
    address: string;
    lat: number;
    lng: number;
    bin_type: BinType;
    sequence_order: number;
  }>;
  deleteStopIds?: string[];
};

type AddStopPayload = {
  society_id?: string | null;
  address: string;
  lat: number;
  lng: number;
  bin_type: BinType;
  sequence_order: number;
};

export async function getRoutes(filters?: { ward_id?: string; shift?: Shift }) {
  const params = new URLSearchParams();
  if (filters?.ward_id) params.set("ward_id", filters.ward_id);
  if (filters?.shift) params.set("shift", filters.shift);
  const qs = params.toString();
  return apiRequest<RouteRecord[]>(`/routes${qs ? `?${qs}` : ""}`);
}

export async function getRouteById(id: string) {
  return apiRequest<RouteDetails>(`/routes/${id}`);
}

export async function createRoute(payload: RoutePayload) {
  return apiRequest<RouteDetails>("/routes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRoute(id: string, payload: Partial<RoutePayload>) {
  return apiRequest<RouteDetails>(`/routes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function addStopToRoute(routeId: string, payload: AddStopPayload) {
  return apiRequest<RouteStop>(`/routes/${routeId}/stops`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function removeStopFromRoute(routeId: string, stopId: string) {
  return apiRequest<{ id: string }>(`/routes/${routeId}/stops/${stopId}`, {
    method: "DELETE",
  });
}

export async function deleteRoute(id: string) {
  return apiRequest<{ id: string }>(`/routes/${id}`, {
    method: "DELETE",
  });
}
