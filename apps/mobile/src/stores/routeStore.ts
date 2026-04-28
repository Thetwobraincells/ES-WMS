/**
 * Route Store — Zustand state management for driver route & stops.
 *
 * Manages the current driver's route, stops, and all stop actions
 * (complete, skip, upload photo) by calling the backend API.
 *
 * Includes auto-polling (30s) to pick up route changes made by the admin
 * from the ICCC web dashboard — no manual refresh needed.
 */
import { create } from 'zustand';
import * as routeService from '../services/route.service';
import * as stopService from '../services/stop.service';
import type { RouteData, Stop, RouteProgress, Vehicle, SkipReason } from '../types/api';

const POLL_INTERVAL_MS = 30_000; // 30 seconds

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

  // Route change detection
  routeUpdatedByAdmin: boolean;
  lastStopHash: string | null;

  // Polling
  _pollTimer: ReturnType<typeof setInterval> | null;

  // Actions
  fetchMyRoute: () => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
  dismissRouteUpdate: () => void;
  completeStop: (stopId: string) => Promise<void>;
  skipStop: (stopId: string, reason: SkipReason, notes?: string) => Promise<void>;
  uploadPhoto: (stopId: string, photoUri: string, lat: number, lng: number) => Promise<{ geofence_valid: boolean }>;
  clearError: () => void;
  reset: () => void;
}

/**
 * Build a lightweight hash of the route's stop list to detect changes.
 * Uses stop IDs + sequence orders + stop count.
 */
function buildStopHash(stops: Stop[]): string {
  return stops
    .map((s) => `${s.id}:${s.sequence_order}:${s.status}`)
    .join('|');
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
  routeUpdatedByAdmin: false,
  lastStopHash: null,
  _pollTimer: null,

  /**
   * Fetch the current driver's assigned route for this shift.
   * GET /api/v1/routes/my-route
   */
  fetchMyRoute: async () => {
    const { isActioning } = get();
    // Don't fetch while a stop action is in progress — avoid race conditions
    if (isActioning) return;

    set({ isLoading: true, error: null });
    try {
      const data = await routeService.getMyRoute();

      // Detect admin changes by comparing stop hashes
      const oldHash = get().lastStopHash;
      const newHash = buildStopHash(data.stops);
      const routeChanged = oldHash !== null && oldHash !== newHash;

      set({
        isLoading: false,
        route: data,
        stops: data.stops,
        progress: data.progress,
        vehicle: data.vehicle,
        lastStopHash: newHash,
        // Only set the banner if stop structure actually changed
        routeUpdatedByAdmin: routeChanged ? true : get().routeUpdatedByAdmin,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to fetch route';
      const axiosError = err as { response?: { status?: number, data?: { error?: string } } };
      const axiosMessage = axiosError?.response?.data?.error;
      
      if (axiosError?.response?.status === 404) {
        set({
          isLoading: false,
          route: null,
          stops: [],
          progress: null,
          vehicle: null,
          error: axiosMessage ?? message,
        });
      } else {
        set({
          isLoading: false,
          error: axiosMessage ?? message,
        });
      }
    }
  },

  /**
   * Start auto-polling for route updates from the admin dashboard.
   * Call this when RouteOverview mounts.
   */
  startPolling: () => {
    const existing = get()._pollTimer;
    if (existing) clearInterval(existing);

    const timer = setInterval(() => {
      get().fetchMyRoute();
    }, POLL_INTERVAL_MS);

    set({ _pollTimer: timer });
  },

  /**
   * Stop auto-polling. Call this when RouteOverview unmounts.
   */
  stopPolling: () => {
    const timer = get()._pollTimer;
    if (timer) clearInterval(timer);
    set({ _pollTimer: null });
  },

  /**
   * Dismiss the "route updated by admin" banner.
   */
  dismissRouteUpdate: () => set({ routeUpdatedByAdmin: false }),

  /**
   * Mark a stop as completed, then refresh the route.
   * PATCH /api/v1/stops/:id/complete
   */
  completeStop: async (stopId: string) => {
    set({ isActioning: true, error: null });
    try {
      await stopService.completeStop(stopId);
      // Refresh route to get updated stop statuses + progress
      set({ isActioning: false });
      await get().fetchMyRoute();
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
      set({ isActioning: false });
      await get().fetchMyRoute();
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
      set({ isActioning: false });
      await get().fetchMyRoute();
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

  reset: () => {
    const timer = get()._pollTimer;
    if (timer) clearInterval(timer);
    set({
      route: null,
      stops: [],
      progress: null,
      vehicle: null,
      isLoading: false,
      isActioning: false,
      error: null,
      routeUpdatedByAdmin: false,
      lastStopHash: null,
      _pollTimer: null,
    });
  },
}));
