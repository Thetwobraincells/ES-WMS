/**
 * Authentication API service — OTP request/verify for mobile users.
 */
import api, { extractData } from './api';
import type { OtpRequestResponse, AuthResponse } from '../types/api';

export async function requestOtp(mobile: string): Promise<OtpRequestResponse> {
  const res = await api.post('/auth/request-otp', { mobile });
  return extractData<OtpRequestResponse>(res);
}

export async function verifyOtp(mobile: string, otp: string): Promise<AuthResponse> {
  const res = await api.post('/auth/verify-otp', { mobile, otp });
  return extractData<AuthResponse>(res);
}
