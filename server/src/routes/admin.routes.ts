import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
  listUsers,
  createUser,
  updateUser,
  getMassBalance,
  createUserSchema,
  updateUserSchema,
} from "../controllers/admin.controller";
import { getDashboardSummary, listWards } from "../controllers/dashboard.controller";
import { listSocieties } from "../controllers/society.controller";
import { UserRole } from "@prisma/client";

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

// ── User Management ─────────────────────────────────────────────────────────
router.get("/users", listUsers);
router.post("/users", validate(createUserSchema), createUser);
router.patch("/users/:id", validate(updateUserSchema), updateUser);

// ── Mass Balance ────────────────────────────────────────────────────────────
router.get("/mass-balance", getMassBalance);

// GET /api/v1/admin/dashboard — Aggregated dashboard summary
router.get("/dashboard", getDashboardSummary);

// GET /api/v1/admin/wards — List all wards
router.get("/wards", listWards);

// GET /api/v1/admin/societies — List all societies
router.get("/societies", listSocieties);

export default router;
``