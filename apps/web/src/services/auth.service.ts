import { apiRequest } from "@/services/api";

export type AuthUser = {
  id: string;
  role: string;
};

type LoginResponse = {
  token: string;
  user: AuthUser;
};

export async function login(payload: { email: string; password: string; otp?: string }) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
