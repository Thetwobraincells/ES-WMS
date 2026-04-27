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
  getZoneRoutes,
  addStopToRoute,
  removeStopFromRoute,
  createRouteSchema,
  updateRouteSchema,
  addStopSchema,
} from "../controllers/route.controller";
import { UserRole } from "@prisma/client";

const router = Router();

// All route endpoints require authentication
router.use(authenticate);

// Driver: get current shift route
router.get("/my-route", requireRole(UserRole.DRIVER, UserRole.SUPERVISOR), getMyRoute);

// Supervisor: get all zone routes for their ward — FR-DRV-07
router.get("/zone", requireRole(UserRole.SUPERVISOR), getZoneRoutes);

// Admin: list all routes
router.get("/", requireRole(UserRole.ADMIN), listRoutes);

// Admin: get single route details
router.get("/:id", requireRole(UserRole.ADMIN, UserRole.SUPERVISOR), getRoute);

// Admin: create route
router.post("/", requireRole(UserRole.ADMIN), validate(createRouteSchema), createRoute);

// Admin: update route (supports adding/removing stops)
router.patch("/:id", requireRole(UserRole.ADMIN), validate(updateRouteSchema), updateRoute);

// Admin: add a stop to a route
router.post("/:id/stops", requireRole(UserRole.ADMIN), validate(addStopSchema), addStopToRoute);

// Admin: remove a stop from a route
router.delete("/:id/stops/:stopId", requireRole(UserRole.ADMIN), removeStopFromRoute);

// Admin: delete route
router.delete("/:id", requireRole(UserRole.ADMIN), deleteRoute);

export default router;
