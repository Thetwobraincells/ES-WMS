import { apiRequest } from "@/services/api";
import { getAuthToken } from "@/services/session";

export type MassBalanceVehicle = {
  vehicle_id: string;
  registration_no: string;
  capacity_kg: number;
  peak_load_kg: number;
  utilization_percent: number;
  collected_weight?: number;
  dumped_weight?: number;
};

export type MassBalanceReport = {
  date: string;
  vehicles: MassBalanceVehicle[];
  summary: {
    total_collected_kg: number;
    total_capacity_kg: number;
    vehicle_count: number;
  };
};

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000/api/v1";

export async function getMassBalance(date: string) {
  return apiRequest<MassBalanceReport>(`/admin/mass-balance?date=${encodeURIComponent(date)}`);
}

export async function exportMassBalancePdf(date: string) {
  const token = getAuthToken();
  const response = await fetch(`${BASE_URL}/admin/mass-balance/export?date=${encodeURIComponent(date)}`, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error("Failed to export PDF report.");
  }

  return response.blob();
}
