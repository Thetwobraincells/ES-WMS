import { apiRequest } from "@/services/api";

export type Shift = "AM" | "PM";

export type RouteRecord = {
  id: string;
  ward_id: string;
  vehicle_id: string;
  driver_id: string;
  supervisor_id?: string | null;
  shift: Shift;
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
};

export type RouteDetails = RouteRecord & {
  stops: RouteStop[];
};

type RoutePayload = {
  ward_id: string;
  vehicle_id: string;
  driver_id: string;
  supervisor_id?: string;
  shift: Shift;
  is_active?: boolean;
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
  return apiRequest<RouteRecord>("/routes", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateRoute(id: string, payload: Partial<RoutePayload> & { is_active?: boolean }) {
  return apiRequest<RouteRecord>(`/routes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function deleteRoute(id: string) {
  return apiRequest<{ id: string }>(`/routes/${id}`, {
    method: "DELETE",
  });
}
