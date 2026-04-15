import { apiRequest } from "@/services/api";

export type AlertStatus = "ACTIVE" | "RESOLVED";

export type AlertItem = {
  id: string;
  type: string;
  message: string;
  status: AlertStatus;
  created_at: string;
};

export async function getAlerts(filters?: { type?: string; status?: AlertStatus }) {
  const params = new URLSearchParams();
  if (filters?.type) params.set("type", filters.type);
  if (filters?.status) params.set("status", filters.status);
  const qs = params.toString();
  return apiRequest<AlertItem[]>(`/admin/alerts${qs ? `?${qs}` : ""}`);
}

export async function updateAlertStatus(id: string, status: "RESOLVED" | "DISMISSED") {
  return apiRequest<{ id: string; status: string }>(`/admin/alerts/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  });
}
