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

export default router;
