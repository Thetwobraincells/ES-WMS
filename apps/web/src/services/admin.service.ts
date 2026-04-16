import { apiRequest } from "@/services/api";

export type Ward = {
  id: string;
  name: string;
};

export type VehicleOption = {
  id: string;
  registration_no: string;
};

export type DashboardSummary = {
  date: string;
  routes: {
    active: number;
  };
  stops: {
    total: number;
    completed: number;
    skipped: number;
    pending: number;
    completion_percent: number;
  };
  backlogs: {
    pending: number;
  };
  fines: {
    pending: number;
  };
  societies: {
    total: number;
    complaints_today: number;
  };
  vehicles: {
    active: number;
  };
};

export async function getWards() {
  return apiRequest<Ward[]>("/admin/wards");
}

export async function getVehicles() {
  return apiRequest<VehicleOption[]>("/vehicles");
}

export async function getDashboardSummary() {
  return apiRequest<DashboardSummary>("/admin/dashboard");
}
