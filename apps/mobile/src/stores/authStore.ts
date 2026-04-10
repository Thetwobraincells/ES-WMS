/**
 * Auth Store — Zustand state management for authentication.
 *
 * Replaces the mock OTP flow with real API calls to the backend.
 * Persists JWT + user data to AsyncStorage for session resume.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as authService from '../services/auth.service';
import type { AuthUser, UserRole } from '../types/api';

// ─── State Shape ─────────────────────────────────────────────────────────────

interface AuthState {
  // Data
  token: string | null;
  user: AuthUser | null;

  // UI state
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // OTP flow state
  otpSent: boolean;
  otpMobile: string | null;
  devOtp: string | null;   // OTP returned by dev server for testing

  // Actions
  requestOtp: (mobile: string) => Promise<void>;
  verifyOtp: (mobile: string, otp: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  resetOtpSent: () => void;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Initial state
      token: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      otpSent: false,
      otpMobile: null,
      devOtp: null,

      /**
       * Step 1: Request OTP from backend.
       * POST /api/v1/auth/request-otp
       */
      requestOtp: async (mobile: string) => {
        set({ isLoading: true, error: null, devOtp: null });
        try {
          const data = await authService.requestOtp(mobile);
          set({
            isLoading: false,
            otpSent: true,
            otpMobile: mobile,
            devOtp: data.otp,  // Dev convenience — backend returns the OTP in development mode
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Failed to send OTP';
          // Axios errors have response.data
          const axiosMessage = (err as { response?: { data?: { error?: string } } })
            ?.response?.data?.error;
          set({
            isLoading: false,
            error: axiosMessage ?? message,
          });
        }
      },

      /**
       * Step 2: Verify OTP and get JWT.
       * POST /api/v1/auth/verify-otp
       */
      verifyOtp: async (mobile: string, otp: string) => {
        set({ isLoading: true, error: null });
        try {
          const data = await authService.verifyOtp(mobile, otp);
          set({
            isLoading: false,
            token: data.token,
            user: data.user,
            isAuthenticated: true,
            otpSent: false,
            otpMobile: null,
            devOtp: null,
          });
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'OTP verification failed';
          const axiosMessage = (err as { response?: { data?: { error?: string } } })
            ?.response?.data?.error;
          set({
            isLoading: false,
            error: axiosMessage ?? message,
          });
        }
      },

      /**
       * Clear auth state and token.
       */
      logout: () => {
        set({
          token: null,
          user: null,
          isAuthenticated: false,
          otpSent: false,
          otpMobile: null,
          devOtp: null,
          error: null,
        });
      },

      clearError: () => set({ error: null }),

      /** Reset OTP form state allowing number to be updated */
      resetOtpSent: () => set({ otpSent: false, devOtp: null }),
    }),
    {
      name: 'es-wms-auth',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    },
  ),
);