import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { getSocietyStatus, submitComplaint, listSocieties, complaintSchema } from "../controllers/society.controller";
import { UserRole } from "@prisma/client";

const router = Router();

router.use(authenticate);

// GET /api/v1/societies — Admin: list all societies
router.get("/", requireRole(UserRole.ADMIN), listSocieties);

// GET /api/v1/societies/:id/status — Citizen: today's collection status
router.get("/:id/status", requireRole(UserRole.CITIZEN, UserRole.ADMIN), getSocietyStatus);

// POST /api/v1/societies/:id/complaint — Citizen: submit missed collection complaint
router.post("/:id/complaint", requireRole(UserRole.CITIZEN), validate(complaintSchema), submitComplaint);

export default router;
