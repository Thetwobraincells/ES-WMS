/**
 * Society API service — collection status + complaint submission for citizens.
 */
import api, { extractData } from './api';
import type { SocietyStatusResponse } from '../types/api';

type ComplaintPhoto = {
  uri: string;
  name?: string;
  type?: string;
};

function inferMimeType(uri: string) {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.heic')) return 'image/heic';
  return 'image/jpeg';
}

/**
 * Get today's collection status for a society.
 * PRD FR-CIT-01.
 */
export async function getSocietyStatus(societyId: string): Promise<SocietyStatusResponse> {
  const res = await api.get(`/societies/${societyId}/status`);
  return extractData<SocietyStatusResponse>(res);
}

/**
 * Submit a missed-collection complaint.
 * PRD FR-CIT-03.
 */
export async function submitComplaint(
  societyId: string,
  description: string,
  photo: ComplaintPhoto,
  coords?: { lat: number; lng: number } | null,
): Promise<{ message: string }> {
  const formData = new FormData();
  formData.append('description', description);
  formData.append('photo', {
    uri: photo.uri,
    name: photo.name ?? `complaint-${Date.now()}.jpg`,
    type: photo.type ?? inferMimeType(photo.uri),
  } as unknown as Blob);

  if (coords) {
    formData.append('lat', coords.lat.toString());
    formData.append('lng', coords.lng.toString());
  }

  const res = await api.post(`/societies/${societyId}/complaint`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return extractData<{ message: string }>(res);
}

/**
 * Get fines for a society.
 */
export async function getSocietyFines(societyId: string): Promise<{ wallet_balance: number, fines: any[] }> {
  const res = await api.get(`/societies/${societyId}/fines`);
  return extractData<{ wallet_balance: number, fines: any[] }>(res);
}
