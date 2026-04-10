/**
 * Centralized Axios instance for ES-WMS API communication.
 *
 * Features:
 *   • Request interceptor — attaches JWT from auth store
 *   • Response interceptor — handles 401 auto-logout
 *   • Timeout configuration
 */
import axios from 'axios';
import { Config } from '../config';

import type { ApiResponse } from '../types/api';

const api = axios.create({
  baseURL: Config.API_BASE_URL,
  timeout: Config.API_TIMEOUT,
  headers: { 'Content-Type': 'application/json' },
});

// ─── Request Interceptor — Attach JWT ────────────────────────────────────────

api.interceptors.request.use(
  (config) => {
    const { useAuthStore } = require('../stores/authStore');
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// ─── Response Interceptor — Handle 401 ───────────────────────────────────────

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid — force logout
      const { useAuthStore } = require('../stores/authStore');
      const { logout } = useAuthStore.getState();
      logout();
    }
    return Promise.reject(error);
  },
);

// ─── Helper — Extract typed data from API responses ──────────────────────────

export function extractData<T>(response: { data: ApiResponse<T> }): T {
  if (!response.data.success) {
    throw new Error(response.data.error ?? 'API request failed');
  }
  return response.data.data as T;
}

export default api;
