/**
 * Society API service — collection status + complaint submission for citizens.
 */
import api, { extractData } from './api';
import type { SocietyStatusResponse } from '../types/api';

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
  photoUrl?: string,
): Promise<{ message: string }> {
  const res = await api.post(`/societies/${societyId}/complaint`, {
    description,
    photo_url: photoUrl,
  });
  return extractData<{ message: string }>(res);
}
