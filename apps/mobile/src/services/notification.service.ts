/**
 * Notification API service — fetch & mark-read notifications.
 */
import api, { extractData } from './api';
import type { Notification } from '../types/api';

/**
 * Get the current user's notifications (last 30 days).
 * PRD FR-CIT-06.
 */
export async function getMyNotifications(page = 1, limit = 20): Promise<Notification[]> {
  const res = await api.get('/notifications', { params: { page, limit } });
  return extractData<Notification[]>(res);
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(notificationId: string) {
  const res = await api.patch(`/notifications/${notificationId}/read`);
  return extractData(res);
}
