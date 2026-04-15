import { apiRequest } from "@/services/api";

export type SystemSettingKey =
  | "GEOFENCE_RADIUS_METERS"
  | "DEFAULT_FINE_AMOUNT"
  | "TRUCK_FULL_THRESHOLD_PERCENT";

export type SystemSetting = {
  key: SystemSettingKey;
  value: number;
  description: string;
  updated_at: string | null;
};

export async function getSystemSettings() {
  return apiRequest<SystemSetting[]>("/admin/settings");
}

export async function updateSystemSetting(key: SystemSettingKey, value: number) {
  return apiRequest<SystemSetting>(`/admin/settings/${key}`, {
    method: "PATCH",
    body: JSON.stringify({ value }),
  });
}
