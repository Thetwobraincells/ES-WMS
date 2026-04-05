import { Router } from "express";
import { validate } from "../middleware/validate";
import { receiveTelemetry, telemetrySchema } from "../controllers/telemetry.controller";

const router = Router();

// POST /api/v1/iot/telemetry — Receive IoT engine telemetry (API key auth, not JWT)
router.post("/telemetry", validate(telemetrySchema), receiveTelemetry);

export default router;
