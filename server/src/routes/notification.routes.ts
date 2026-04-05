import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { getMyNotifications, markAsRead } from "../controllers/notification.controller";

const router = Router();

router.use(authenticate);

// GET /api/v1/notifications — Get current user's notifications
router.get("/", getMyNotifications);

// PATCH /api/v1/notifications/:id/read — Mark notification as read
router.patch("/:id/read", markAsRead);

export default router;
