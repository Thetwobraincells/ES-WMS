import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { generateOtp, verifyOtpAndLogin, adminLogin, AuthError } from "../services/auth.service";
import { sendSuccess, sendError } from "../utils/apiResponse";

// ─── Validation Schemas ─────────────────────────────────────────────────────

export const requestOtpSchema = z.object({
  mobile: z.string().min(10).max(15),
});

export const verifyOtpSchema = z.object({
  mobile: z.string().min(10).max(15),
  otp: z.string().length(6),
});

export const adminLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// ─── Handlers ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/auth/request-otp
 * Request a mock OTP for mobile login.
 */
export async function requestOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { mobile } = req.body;
    const result = await generateOtp(mobile);
    sendSuccess(res, result);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/auth/verify-otp
 * Verify OTP and receive JWT.
 */
export async function verifyOtp(req: Request, res: Response, next: NextFunction) {
  try {
    const { mobile, otp } = req.body;
    const result = await verifyOtpAndLogin(mobile, otp);
    sendSuccess(res, result);
  } catch (err) {
    if (err instanceof AuthError) {
      sendError(res, err.message, 401, err.code);
      return;
    }
    next(err);
  }
}

/**
 * POST /api/v1/auth/admin-login
 * Admin login via email + password.
 */
export async function adminLoginHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, password } = req.body;
    const result = await adminLogin(email, password);
    sendSuccess(res, result);
  } catch (err) {
    if (err instanceof AuthError) {
      sendError(res, err.message, 401, err.code);
      return;
    }
    next(err);
  }
}
