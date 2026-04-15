import { apiRequest } from "@/services/api";

export type SocietyRecord = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  contact_name: string | null;
  contact_mobile: string | null;
  wallet_balance: number;
  ward_id: string;
  ward?: { id: string; name: string };
};

export async function getSocieties() {
  return apiRequest<SocietyRecord[]>("/admin/societies");
}
