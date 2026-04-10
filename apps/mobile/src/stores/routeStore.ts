/**
 * Route Store — Zustand state management for driver route & stops.
 *
 * Manages the current driver's route, stops, and all stop actions
 * (complete, skip, upload photo) by calling the backend API.
 */
import { create } from 'zustand';
import * as routeService from '../services/route.service';
import * as stopService from '../services/stop.service';
import type { RouteData, Stop, RouteProgress, Vehicle, SkipReason } from '../types/api';

// ─── State Shape ─────────────────────────────────────────────────────────────

interface RouteState {
  // Data
  route: RouteData | null;
  stops: Stop[];
  progress: RouteProgress | null;
  vehicle: Vehicle | null;

  // UI state
  isLoading: boolean;
  isActioning: boolean;  // for stop complete/skip/upload
  error: string | null;

  // Actions
  fetchMyRoute: () => Promise<void>;
  completeStop: (stopId: string) => Promise<void>;
  skipStop: (stopId: string, reason: SkipReason, notes?: string) => Promise<void>;
  uploadPhoto: (stopId: string, photoUri: string, lat: number, lng: number) => Promise<{ geofence_valid: boolean }>;
  clearError: () => void;
  reset: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useRouteStore = create<RouteState>()((set, get) => ({
  // Initial state
  route: null,
  stops: [],
  progress: null,
  vehicle: null,
  isLoading: false,
  isActioning: false,
  error: null,

  /**
   * Fetch the current driver's assigned route for this shift.
   * GET /api/v1/routes/my-route
   */
  fetchMyRoute: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await routeService.getMyRoute();
      set({
        isLoading: false,
        route: data,
        stops: data.stops,
        progress: data.progress,
        vehicle: data.vehicle,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch route';
      const axiosMessage = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      set({
        isLoading: false,
        error: axiosMessage ?? message,
      });
    }
  },

  /**
   * Mark a stop as completed, then refresh the route.
   * PATCH /api/v1/stops/:id/complete
   */
  completeStop: async (stopId: string) => {
    set({ isActioning: true, error: null });
    try {
      await stopService.completeStop(stopId);
      // Refresh route to get updated stop statuses + progress
      await get().fetchMyRoute();
      set({ isActioning: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete stop';
      const axiosMessage = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      set({
        isActioning: false,
        error: axiosMessage ?? message,
      });
      throw err;  // re-throw so the UI can handle it
    }
  },

  /**
   * Skip a stop with a reason code.
   * PATCH /api/v1/stops/:id/skip
   */
  skipStop: async (stopId: string, reason: SkipReason, notes?: string) => {
    set({ isActioning: true, error: null });
    try {
      await stopService.skipStop(stopId, reason, notes);
      await get().fetchMyRoute();
      set({ isActioning: false });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to skip stop';
      const axiosMessage = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      set({
        isActioning: false,
        error: axiosMessage ?? message,
      });
      throw err;
    }
  },

  /**
   * Upload a geotagged photo for a stop.
   * POST /api/v1/stops/:id/photos
   */
  uploadPhoto: async (stopId: string, photoUri: string, lat: number, lng: number) => {
    set({ isActioning: true, error: null });
    try {
      const result = await stopService.uploadPhoto(stopId, photoUri, lat, lng);
      await get().fetchMyRoute();
      set({ isActioning: false });
      return { geofence_valid: result.geofence_valid };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Photo upload failed';
      const axiosMessage = (err as { response?: { data?: { error?: string } } })
        ?.response?.data?.error;
      set({
        isActioning: false,
        error: axiosMessage ?? message,
      });
      throw err;
    }
  },

  clearError: () => set({ error: null }),

  reset: () => set({
    route: null,
    stops: [],
    progress: null,
    vehicle: null,
    isLoading: false,
    isActioning: false,
    error: null,
  }),
}));
