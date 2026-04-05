import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { getLiveVehicles, listVehicles } from "../controllers/vehicle.controller";
import { UserRole } from "@prisma/client";

const router = Router();

router.use(authenticate);

// GET /api/v1/vehicles/live — Live vehicle positions for admin map
router.get("/live", requireRole(UserRole.ADMIN, UserRole.SUPERVISOR), getLiveVehicles);

// GET /api/v1/vehicles — List all vehicles
router.get("/", requireRole(UserRole.ADMIN), listVehicles);

export default router;
