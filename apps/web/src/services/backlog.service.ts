import { apiRequest } from "@/services/api";

export type BacklogPriority = {
  missed_count: number;
  urgency_score: number;
};

export type BacklogItem = {
  id: string;
  original_stop_id: string;
  reason: string;
  priority?: BacklogPriority;
  status: string;
};

export async function getBacklogs() {
  return apiRequest<BacklogItem[]>("/admin/backlog");
}

export async function reassignBacklog(id: string, new_route_id: string) {
  return apiRequest<{ message: string }>(`/admin/backlog/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ new_route_id }),
  });
}
