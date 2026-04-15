import { Router } from "express";
import { UserRole } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { listAlerts, resolveAlert, dismissAlert } from "../controllers/alert.controller";

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

// GET /api/v1/admin/alerts — List admin alerts
router.get("/", listAlerts);

// PATCH /api/v1/admin/alerts/:id/resolve — Resolve an alert
router.patch("/:id/resolve", resolveAlert);

// PATCH /api/v1/admin/alerts/:id/dismiss — Dismiss an alert
router.patch("/:id/dismiss", dismissAlert);

export default router;
