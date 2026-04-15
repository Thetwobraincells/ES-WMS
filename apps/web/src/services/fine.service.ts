import { apiRequest } from "@/services/api";

export type FineStatus = "PENDING" | "APPROVED" | "REJECTED";

export type FineEvent = {
  id: string;
  society_id: string;
  amount: number;
  reason: string;
  driver_id?: string | null;
  photo_url?: string | null;
  status: FineStatus;
  notes?: string | null;
  created_at: string;
  society?: { name: string } | null;
  stop?: { address?: string | null } | null;
};

export async function getFineEvents() {
  return apiRequest<FineEvent[]>("/admin/fine-events");
}

export async function approveFine(id: string) {
  return apiRequest<{ message: string }>(`/admin/fine-events/${id}/approve`, {
    method: "POST",
  });
}

export async function rejectFine(id: string, notes: string) {
  return apiRequest<{ message: string }>(`/admin/fine-events/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ notes }),
  });
}
