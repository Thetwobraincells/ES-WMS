import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { listFineEvents, approveFineHandler, rejectFineHandler, rejectFineSchema } from "../controllers/fine.controller";
import { UserRole } from "@prisma/client";

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

// GET /api/v1/admin/fine-events — List all fine events
router.get("/", listFineEvents);

// POST /api/v1/admin/fine-events/:id/approve — Approve a fine
router.post("/:id/approve", approveFineHandler);

// POST /api/v1/admin/fine-events/:id/reject — Reject a fine
router.post("/:id/reject", validate(rejectFineSchema), rejectFineHandler);

export default router;
