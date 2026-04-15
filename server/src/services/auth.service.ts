import jwt, { type Secret, type SignOptions } from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { prisma } from "../utils/prisma";
import { UserRole } from "@prisma/client";

// ─── In-Memory OTP Store (Mock SMS) ─────────────────────────────────────────
// In production, this would be Redis + an SMS gateway (Twilio/MSG91)
const otpStore = new Map<string, { otp: string; expiresAt: number; role?: UserRole }>();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a 6-digit mock OTP and store it in memory.
 * In prototype mode, we also return the OTP directly for testing convenience.
 */
export async function generateOtp(mobile: string): Promise<{ otp: string; message: string }> {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  otpStore.set(mobile, {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
  });

  console.log(`📱 [MOCK SMS] OTP for ${mobile}: ${otp}`);

  return {
    otp, // returned for dev/testing — remove in production
    message: `OTP sent to ${mobile} (mock — check server console)`,
  };
}

/**
 * Verify OTP for mobile login (Driver, Supervisor, Citizen).
 * Returns a signed JWT on success.
 */
export async function verifyOtpAndLogin(mobile: string, otp: string) {
  const stored = otpStore.get(mobile);

  if (!stored) {
    throw new AuthError("No OTP was requested for this number. Request a new OTP.", "OTP_NOT_FOUND");
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(mobile);
    throw new AuthError("OTP has expired. Request a new one.", "OTP_EXPIRED");
  }

  if (stored.otp !== otp) {
    throw new AuthError("Invalid OTP.", "OTP_INVALID");
  }

  // OTP is valid — consume it
  otpStore.delete(mobile);

  // Find user by mobile
  const user = await prisma.user.findUnique({ where: { mobile } });
  if (!user) {
    throw new AuthError("No account found for this mobile number.", "USER_NOT_FOUND");
  }
  if (!user.is_active) {
    throw new AuthError("Your account has been deactivated. Contact admin.", "USER_DEACTIVATED");
  }

  // For CITIZEN users, fetch their society membership
  let society_id: string | null = null;
  if (user.role === UserRole.CITIZEN) {
    const membership = await prisma.societyMember.findFirst({
      where: { user_id: user.id },
      select: { society_id: true },
    });
    society_id = membership?.society_id ?? null;
  }

  const token = signToken(user.id, user.role, "mobile");

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      mobile: user.mobile,
      ward_id: user.ward_id,
      society_id,
    },
  };
}

/**
 * Admin login via email + password.
 */
export async function adminLogin(email: string, password: string, otp?: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || user.role !== UserRole.ADMIN) {
    throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  if (!user.is_active) {
    throw new AuthError("Your account has been deactivated.", "USER_DEACTIVATED");
  }

  if (!user.password_hash) {
    throw new AuthError("Password not set for this account. Contact IT admin.", "NO_PASSWORD");
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    throw new AuthError("Invalid email or password.", "INVALID_CREDENTIALS");
  }

  // Optional 2FA input is accepted for admin login flows.
  // OTP verification can be plugged in here once a provider is wired.
  if (otp && otp.trim().length === 0) {
    throw new AuthError("Invalid 2FA code.", "INVALID_2FA");
  }

  const token = signToken(user.id, user.role, "web");

  return {
    token,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      email: user.email,
    },
  };
}

/**
 * Sign a JWT with appropriate expiry based on platform.
 */
function signToken(userId: string, role: UserRole, platform: "mobile" | "web"): string {
  const expiresIn = (
    platform === "mobile" ? env.JWT_EXPIRY_MOBILE : env.JWT_EXPIRY_WEB
  ) as SignOptions["expiresIn"];

  return jwt.sign({ userId, role }, env.JWT_SECRET as Secret, { expiresIn });
}

/**
 * Hash a plaintext password.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// ─── Custom Error ───────────────────────────────────────────────────────────

export class AuthError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = "AuthError";
  }
}
