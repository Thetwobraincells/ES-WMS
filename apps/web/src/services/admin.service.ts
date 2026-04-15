import { apiRequest } from "@/services/api";

export type Ward = {
  id: string;
  name: string;
};

export type VehicleOption = {
  id: string;
  registration_no: string;
};

export async function getWards() {
  return apiRequest<Ward[]>("/admin/wards");
}

export async function getVehicles() {
  return apiRequest<VehicleOption[]>("/vehicles");
}
