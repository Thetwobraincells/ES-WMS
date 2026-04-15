import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import { listBacklogs, reassignBacklogHandler, reassignBacklogSchema } from "../controllers/backlog.controller";
import { UserRole } from "@prisma/client";

const router = Router();

router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

// GET /api/v1/admin/backlog — List all backlogs
router.get("/", listBacklogs);

// PATCH /api/v1/admin/backlog/:id/reassign — Reassign backlog to new route
router.patch("/:id/reassign", validate(reassignBacklogSchema), reassignBacklogHandler);
// PATCH /api/v1/admin/backlog/:id — Reassign backlog to new route (API alias)
router.patch("/:id", validate(reassignBacklogSchema), reassignBacklogHandler);

export default router;
