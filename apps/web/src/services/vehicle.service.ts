import { apiRequest } from "@/services/api";

export type LiveVehicle = {
  id: string;
  registration_no: string;
  capacity_kg: number;
  position: { lat: number; lng: number } | null;
  current_load_kg: number;
  load_percent: number;
  status: string;
  last_update: string | null;
  driver: { id: string; name: string } | null;
  route_progress: {
    completed: number;
    total: number;
  };
};

export async function getLiveVehicles() {
  return apiRequest<LiveVehicle[]>("/vehicles/live");
}
