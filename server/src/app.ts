import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import { errorHandler } from "./middleware/errorHandler";

// Route imports
import authRoutes from "./routes/auth.routes";
import routeRoutes from "./routes/route.routes";
import stopRoutes from "./routes/stop.routes";
import vehicleRoutes from "./routes/vehicle.routes";
import societyRoutes from "./routes/society.routes";
import backlogRoutes from "./routes/backlog.routes";
import fineRoutes from "./routes/fine.routes";
import notificationRoutes from "./routes/notification.routes";
import telemetryRoutes from "./routes/telemetry.routes";
import adminRoutes from "./routes/admin.routes";

const app = express();

// ─── Global Middleware ──────────────────────────────────────────────────────

app.use(helmet());
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded photos as static files
app.use("/uploads", express.static(path.resolve("./uploads")));

// ─── Health Check ───────────────────────────────────────────────────────────

app.get("/api/v1/health", (_req, res) => {
  res.json({
    success: true,
    data: {
      status: "ok",
      service: "ES-WMS API",
      version: "1.0.0",
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── API Routes (v1) ────────────────────────────────────────────────────────

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/routes", routeRoutes);
app.use("/api/v1/stops", stopRoutes);
app.use("/api/v1/vehicles", vehicleRoutes);
app.use("/api/v1/societies", societyRoutes);
app.use("/api/v1/admin/backlog", backlogRoutes);
app.use("/api/v1/admin/fine-events", fineRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/iot", telemetryRoutes);
app.use("/api/v1/admin", adminRoutes);

// ─── 404 Handler ────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found.",
    code: "NOT_FOUND",
  });
});

// ─── Global Error Handler ───────────────────────────────────────────────────

app.use(errorHandler);

export default app;
