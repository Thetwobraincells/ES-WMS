import { apiRequest } from "@/services/api";

export type UserRole = "DRIVER" | "SUPERVISOR" | "ADMIN" | "CITIZEN";

export type UserRecord = {
  id: string;
  name: string;
  role: UserRole;
  mobile: string | null;
  email: string | null;
  is_active: boolean;
};

type CreateUserInput = {
  name: string;
  role: UserRole;
  mobile?: string;
  email?: string;
  password?: string;
  is_active?: boolean;
};

type UpdateUserInput = {
  name?: string;
  mobile?: string;
  email?: string;
  password?: string;
  is_active?: boolean;
};

export async function getUsers(role?: UserRole) {
  const qs = role ? `?role=${encodeURIComponent(role)}` : "";
  return apiRequest<UserRecord[]>(`/admin/users${qs}`);
}

export async function createUser(payload: CreateUserInput) {
  return apiRequest<UserRecord>("/admin/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: string, payload: UpdateUserInput) {
  return apiRequest<UserRecord>(`/admin/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
