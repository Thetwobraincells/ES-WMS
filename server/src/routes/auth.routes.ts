import { Router } from "express";
import {
  requestOtp,
  verifyOtp,
  adminLoginHandler,
  loginHandler,
  requestOtpSchema,
  verifyOtpSchema,
  adminLoginSchema,
} from "../controllers/auth.controller";
import { validate } from "../middleware/validate";

const router = Router();

// POST /api/v1/auth/request-otp — Request mock OTP for mobile login
router.post("/request-otp", validate(requestOtpSchema), requestOtp);

// POST /api/v1/auth/verify-otp — Verify OTP and get JWT
router.post("/verify-otp", validate(verifyOtpSchema), verifyOtp);

// POST /api/v1/auth/admin-login — Admin email + password login
router.post("/admin-login", validate(adminLoginSchema), adminLoginHandler);
// POST /api/v1/auth/login — Admin email + password (+ optional OTP) login
router.post("/login", validate(adminLoginSchema), loginHandler);

export default router;
