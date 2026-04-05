import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { createNotification } from "../services/notification.service";
import { env } from "../config/env";
import { VehicleStatus, NotificationType } from "@prisma/client";

// ─── Validation Schemas ─────────────────────────────────────────────────────

export const telemetrySchema = z.object({
  vehicle_id: z.string(),
  lat: z.number(),
  lng: z.number(),
  current_load_kg: z.number().int().min(0),
  status: z.nativeEnum(VehicleStatus),
  timestamp: z.string().optional(),
});

// ─── Handlers ───────────────────────────────────────────────────────────────

/**
 * POST /api/v1/iot/telemetry
 * Receive vehicle telemetry from the Mock IoT Engine.
 * Per PRD §6.3: GPS pings + load cell simulation every 30 seconds.
 * Authenticated via API key (not JWT).
 */
export async function receiveTelemetry(req: Request, res: Response, next: NextFunction) {
  try {
    // Validate API key
    const apiKey = req.headers["x-api-key"];
    if (apiKey !== env.IOT_API_KEY) {
      sendError(res, "Invalid IoT API key.", 401, "INVALID_API_KEY");
      return;
    }

    const data = req.body as z.infer<typeof telemetrySchema>;

    // Find vehicle by registration_no or ID
    const vehicle = await prisma.vehicle.findFirst({
      where: {
        OR: [
          { id: data.vehicle_id },
          { registration_no: data.vehicle_id },
        ],
      },
    });

    if (!vehicle) {
      sendError(res, `Vehicle not found: ${data.vehicle_id}`, 404, "VEHICLE_NOT_FOUND");
      return;
    }

    // Insert telemetry record
    const telemetry = await prisma.vehicleTelemetry.create({
      data: {
        vehicle_id: vehicle.id,
        lat: data.lat,
        lng: data.lng,
        current_load_kg: data.current_load_kg,
        status: data.status,
        recorded_at: data.timestamp ? new Date(data.timestamp) : new Date(),
      },
    });

    // ── Capacity alerts (PRD FR-DRV-15, FR-DRV-16) ──
    const loadPercent = (data.current_load_kg / vehicle.capacity_kg) * 100;

    if (loadPercent >= 100) {
      // Get the active route driver for this vehicle
      const activeRoute = await prisma.route.findFirst({
        where: { vehicle_id: vehicle.id, is_active: true },
        include: { driver: true, supervisor: true },
      });

      if (activeRoute) {
        await createNotification({
          targetUserId: activeRoute.driver_id,
          type: NotificationType.TRUCK_FULL,
          title: "🚛 Truck Full",
          body: `Your truck (${vehicle.registration_no}) has reached 100% capacity. Remaining stops will be auto-validated for skip.`,
        });
      }
    } else if (loadPercent >= 90) {
      const activeRoute = await prisma.route.findFirst({
        where: { vehicle_id: vehicle.id, is_active: true },
      });

      if (activeRoute) {
        await createNotification({
          targetUserId: activeRoute.driver_id,
          type: NotificationType.CAPACITY_WARNING,
          title: "⚠️ Truck Approaching Capacity",
          body: `Your truck is at ${Math.round(loadPercent)}% capacity. 1-2 stops remaining.`,
        });
      }
    }

    sendSuccess(res, {
      telemetry_id: telemetry.id,
      load_percent: Math.round(loadPercent),
    }, 201);
  } catch (err) {
    next(err);
  }
}
