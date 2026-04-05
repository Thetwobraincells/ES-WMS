import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Types ────────────────────────────────────────────────────────────────────

export type UserRole = 'DRIVER' | 'SUPERVISOR' | 'CITIZEN' | 'ADMIN';

export interface AuthUser {
  id: string;
  name: string;
  mobile: string;
  role: UserRole;
  /** For DRIVER: the vehicle assigned for the current shift */
  vehicleId?: string;
  /** For SUPERVISOR: the zone they manage */
  zoneId?: string;
  /** For CITIZEN: the society they belong to */
  societyId?: string;
  /** For DRIVER/SUPERVISOR: the ward they operate in */
  wardId?: string;
  /** Profile avatar URL (optional) */
  avatarUrl?: string;
}

export interface AuthState {
  // ── Core state ────────────────────────────────────────────────────────────
  isAuthenticated: boolean;
  isLoading: boolean;
  jwt: string | null;
  user: AuthUser | null;
  otpRequestId: string | null;   // Tracks the pending OTP flow
  error: string | null;

  // ── OTP Flow ──────────────────────────────────────────────────────────────
  /**
   * Step 1 — request an OTP for a given mobile number.
   * In production this calls POST /api/v1/auth/login (phase 1: request OTP).
   * In prototype we mock the response and store a requestId.
   */
  requestOtp: (mobile: string) => Promise<void>;

  /**
   * Step 2 — verify the OTP and exchange it for a JWT + user object.
   * In production this calls POST /api/v1/auth/login (phase 2: verify OTP).
   */
  verifyOtp: (mobile: string, otp: string) => Promise<void>;

  /**
   * Clear all auth state (logout).
   */
  logout: () => void;

  /**
   * Clear any lingering error message.
   */
  clearError: () => void;
}

// ─── Mock API helpers (replace with real Axios calls in Phase 2) ─────────────

/** Simulates network latency */
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Mock OTP request — always succeeds.
 * Returns a fake requestId.
 */
async function mockRequestOtp(mobile: string): Promise<string> {
  await delay(800);
  console.log(`[AUTH] OTP sent to ${mobile}`);
  return `otp_req_${Date.now()}`;
}

/**
 * Mock OTP verification.
 * Uses a fixed OTP '123456' for prototype.
 * Role is inferred from the last digit of the mobile number
 * to allow easy multi-role testing:
 *   xxxxxx1 → DRIVER
 *   xxxxxx2 → SUPERVISOR
 *   xxxxxx3 → CITIZEN
 *   anything else → DRIVER (default)
 */
async function mockVerifyOtp(
  mobile: string,
  otp: string,
): Promise<{ jwt: string; user: AuthUser }> {
  await delay(1000);

  if (otp !== '123456') {
    throw new Error('Invalid OTP. Please try again.');
  }

  const lastDigit = mobile.slice(-1);
  let role: UserRole = 'DRIVER';
  if (lastDigit === '2') role = 'SUPERVISOR';
  else if (lastDigit === '3') role = 'CITIZEN';

  const roleDefaults: Record<UserRole, Partial<AuthUser>> = {
    DRIVER: {
      vehicleId: 'TRUCK-4029',
      wardId: 'WARD-K-EAST',
      name: 'Ajay Sharma',
    },
    SUPERVISOR: {
      zoneId: 'ZONE-04',
      wardId: 'WARD-K-EAST',
      name: 'Priya Mukadam',
    },
    CITIZEN: {
      societyId: 'SOC-CH-402',
      name: 'Meena Desai',
    },
    ADMIN: {
      name: 'Mr. Jagtap',
    },
  };

  const user: AuthUser = {
    id: `USR-${Date.now()}`,
    mobile,
    role,
    ...roleDefaults[role],
  } as AuthUser;

  // Mock JWT (in production this comes from the server)
  const jwt = `mock.jwt.token.${role.toLowerCase()}.${Date.now()}`;

  return { jwt, user };
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, _get) => ({
      // ── Initial state ──────────────────────────────────────────────────────
      isAuthenticated: false,
      isLoading: false,
      jwt: null,
      user: null,
      otpRequestId: null,
      error: null,

      // ── Actions ────────────────────────────────────────────────────────────

      requestOtp: async (mobile: string) => {
        set({ isLoading: true, error: null });
        try {
          const requestId = await mockRequestOtp(mobile);
          set({ otpRequestId: requestId, isLoading: false });
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'Failed to send OTP.';
          set({ error: message, isLoading: false });
        }
      },

      verifyOtp: async (mobile: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
          const { jwt, user } = await mockVerifyOtp(mobile, otp);
          set({
            isAuthenticated: true,
            jwt,
            user,
            otpRequestId: null,
            isLoading: false,
            error: null,
          });
        } catch (err: unknown) {
          const message =
            err instanceof Error ? err.message : 'OTP verification failed.';
          set({ error: message, isLoading: false });
        }
      },

      logout: () => {
        set({
          isAuthenticated: false,
          jwt: null,
          user: null,
          otpRequestId: null,
          error: null,
          isLoading: false,
        });
      },

      clearError: () => set({ error: null }),
    }),
    {
      name: 'es-wms-auth',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist the session token and user — not loading/error states
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        jwt: state.jwt,
        user: state.user,
      }),
    },
  ),
);

// ─── Convenience selectors ────────────────────────────────────────────────────

export const selectRole = (state: AuthState) => state.user?.role ?? null;
export const selectUser = (state: AuthState) => state.user;
export const selectJwt  = (state: AuthState) => state.jwt;
export const selectIsAuthenticated = (state: AuthState) => state.isAuthenticated;