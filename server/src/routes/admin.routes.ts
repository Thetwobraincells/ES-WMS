import { Router } from "express";
import multer from "multer";
import { UserRole } from "@prisma/client";
import { authenticate } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { validate } from "../middleware/validate";
import {
  listUsers,
  createUser,
  updateUser,
  getMassBalance,
  exportMassBalanceReport,
  createUserSchema,
  updateUserSchema,
} from "../controllers/admin.controller";
import { getDashboardSummary, listWards } from "../controllers/dashboard.controller";
import { listSocieties } from "../controllers/society.controller";
import { uploadStopsCsv } from "../controllers/bulk.controller";
import {
  listSystemSettings,
  updateSystemSetting,
  updateSettingParamsSchema,
  updateSettingSchema,
} from "../controllers/settings.controller";
import { listAlerts, updateAlert, updateAlertSchema } from "../controllers/alerts.controller";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authenticate);
router.use(requireRole(UserRole.ADMIN));

// User Management
router.get("/users", listUsers);
router.post("/users", validate(createUserSchema), createUser);
router.patch("/users/:id", validate(updateUserSchema), updateUser);

// Mass Balance
router.get("/mass-balance/export", exportMassBalanceReport);
router.get("/mass-balance", getMassBalance);

// Dashboard
router.get("/dashboard", getDashboardSummary);

// Wards
router.get("/wards", listWards);

// Societies
router.get("/societies", listSocieties);

// Bulk stop upload
router.post("/stops/bulk", upload.single("file"), uploadStopsCsv);

// System settings
router.get("/settings", listSystemSettings);
router.patch(
  "/settings/:key",
  validate(updateSettingParamsSchema, "params"),
  validate(updateSettingSchema),
  updateSystemSetting
);

// Alerts center
router.get("/alerts", listAlerts);
router.patch("/alerts/:id", validate(updateAlertSchema), updateAlert);

export default router;
