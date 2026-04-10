/**
 * Stop API service — complete, skip, and upload photo for stops.
 */
import api, { extractData } from './api';
import * as FileSystem from 'expo-file-system/legacy';
import { Config } from '../config';
import { useAuthStore } from '../stores/authStore';
import type { SkipReason } from '../types/api';

/**
 * Mark a stop as completed.
 */
export async function completeStop(stopId: string) {
  const res = await api.patch(`/stops/${stopId}/complete`);
  return extractData(res);
}

/**
 * Skip a stop with a mandatory reason code.
 * PRD FR-DRV-04: WASTE_MIXED | TRUCK_FULL | INACCESSIBLE | OTHER
 */
export async function skipStop(stopId: string, reason: SkipReason, notes?: string) {
  const res = await api.patch(`/stops/${stopId}/skip`, { reason, notes });
  return extractData(res);
}

/**
 * Upload a geotagged photo for a stop.
 * Uses a multipart form-data upload with the device's GPS coordinates.
 * PRD FR-DRV-09 through FR-DRV-13.
 */
export async function uploadPhoto(
  stopId: string,
  photoUri: string,
  lat: number,
  lng: number,
): Promise<{ id: string; url: string; geofence_valid: boolean; distance_meters?: number }> {
  const token = useAuthStore.getState().token;
  if (!token) {
    throw new Error('Authentication required before uploading photos.');
  }

  // Use FileSystem.uploadAsync for reliable multipart upload from Expo
  const response = await FileSystem.uploadAsync(
    `${Config.API_BASE_URL}/stops/${stopId}/photos`,
    photoUri,
    {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.MULTIPART,
      fieldName: 'photo',
      parameters: {
        lat: lat.toString(),
        lng: lng.toString(),
      },
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  );

  const parsed = JSON.parse(response.body);
  if (!parsed.success) {
    throw new Error(parsed.error ?? 'Photo upload failed');
  }
  const photo = parsed.data?.photo;
  return {
    id: photo.id,
    url: photo.url,
    geofence_valid: photo.geofence_valid,
    distance_meters: parsed.data?.geofence?.distanceMeters,
  };
}
