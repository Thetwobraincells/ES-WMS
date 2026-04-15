import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
  getMyRoute,
  listRoutes,
  getRoute,
  createRoute,
  updateRoute,
  deleteRoute,
  createRouteSchema,
  updateRouteSchema,
} from "../controllers/route.controller";
import { UserRole } from "@prisma/client";

const router = Router();

// All route endpoints require authentication
router.use(authenticate);

// Driver: get current shift route
router.get("/my-route", requireRole(UserRole.DRIVER, UserRole.SUPERVISOR), getMyRoute);

// Admin: list all routes
router.get("/", requireRole(UserRole.ADMIN), listRoutes);

// Admin: get single route details
router.get("/:id", requireRole(UserRole.ADMIN, UserRole.SUPERVISOR), getRoute);

// Admin: create route
router.post("/", requireRole(UserRole.ADMIN), validate(createRouteSchema), createRoute);

// Admin: update route
router.patch("/:id", requireRole(UserRole.ADMIN), validate(updateRouteSchema), updateRoute);
// Admin: delete route
router.delete("/:id", requireRole(UserRole.ADMIN), deleteRoute);

export default router;
