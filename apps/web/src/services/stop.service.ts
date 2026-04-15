import { apiRequest } from "@/services/api";

export type MapStop = {
  id: string;
  route_id: string;
  society_id: string | null;
  address: string;
  lat: number;
  lng: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "SKIPPED" | "BACKLOGGED";
  skip_reason: string | null;
  updated_at: string;
};

export async function getStops() {
  return apiRequest<MapStop[]>("/stops");
}
