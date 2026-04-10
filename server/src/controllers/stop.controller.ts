import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { logAudit } from "../services/audit.service";
import { createBacklogForSkippedStop } from "../services/backlog.service";
import { createFineForMixedWaste } from "../services/fine.service";
import { notifySocietyOfSkip, notifyFalseFullClaim } from "../services/notification.service";
import { isWithinGeofence } from "../services/geofence.service";
import { env } from "../config/env";
import { getSingleValue } from "../utils/request";
import { SkipReason, StopStatus } from "@prisma/client";

// ─── Validation Schemas ─────────────────────────────────────────────────────

export const skipStopSchema = z.object({
  reason: z.nativeEnum(SkipReason),
  notes: z.string().optional(),
});

export const uploadPhotoSchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
});

// ─── Handlers ───────────────────────────────────────────────────────────────

/**
 * PATCH /api/v1/stops/:id/complete
 * Mark a stop as completed.
 * Per PRD FR-DRV-03: driver can mark complete only after uploading a geotagged photo
 * within 50m of stop coordinates.
 */
export async function completeStop(req: Request, res: Response, next: NextFunction) {
  try {
    const stopId = getSingleValue(req.params.id)!;

    const stop = await prisma.stop.findUniqueOrThrow({
      where: { id: stopId },
      include: {
        photos: true,
        route: { select: { driver_id: true } },
      },
    });

    if (stop.route.driver_id !== req.user!.userId) {
      sendError(res, "You are not assigned to this stop.", 403, "STOP_ACCESS_DENIED");
      return;
    }

    // Validate at least one geofence-valid photo exists
    const validPhotos = stop.photos.filter((p) => p.geofence_valid);
    if (validPhotos.length === 0) {
      sendError(
        res,
        "Cannot complete stop. Upload a geotagged photo taken within 50m of the stop first.",
        400,
        "NO_VALID_PHOTO"
      );
      return;
    }

    if (stop.status === StopStatus.COMPLETED) {
      sendError(res, "Stop is already completed.", 400, "ALREADY_COMPLETED");
      return;
    }

    const updated = await prisma.stop.update({
      where: { id: stopId },
      data: {
        status: StopStatus.COMPLETED,
        completed_at: new Date(),
      },
    });

    await logAudit({
      actorId: req.user!.userId,
      action: "COMPLETE_STOP",
      entityType: "Stop",
      entityId: stopId,
      oldValue: { status: stop.status },
      newValue: { status: StopStatus.COMPLETED },
    });

    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/stops/:id/skip
 * Mark a stop as skipped with a mandatory reason code.
 * Per PRD FR-DRV-04, FR-DRV-05, FR-DRV-17, FR-ADM-11.
 */
export async function skipStop(req: Request, res: Response, next: NextFunction) {
  try {
    const stopId = getSingleValue(req.params.id)!;
    const { reason, notes } = req.body as z.infer<typeof skipStopSchema>;

    const stop = await prisma.stop.findUniqueOrThrow({
      where: { id: stopId },
      include: {
        route: { include: { vehicle: true, supervisor: true, driver: true } },
        society: true,
      },
    });

    if (stop.route.driver_id !== req.user!.userId) {
      sendError(res, "You are not assigned to this stop.", 403, "STOP_ACCESS_DENIED");
      return;
    }

    if (stop.status === StopStatus.COMPLETED || stop.status === StopStatus.SKIPPED) {
      sendError(res, `Stop is already ${stop.status.toLowerCase()}.`, 400, "INVALID_STATUS");
      return;
    }

    // ── FR-DRV-17: Validate TRUCK_FULL against actual load ──
    if (reason === SkipReason.TRUCK_FULL) {
      const latestTelemetry = await prisma.vehicleTelemetry.findFirst({
        where: { vehicle_id: stop.route.vehicle_id },
        orderBy: { recorded_at: "desc" },
      });

      if (latestTelemetry) {
        const loadPercent = (latestTelemetry.current_load_kg / stop.route.vehicle.capacity_kg) * 100;

        if (loadPercent < env.TRUCK_FULL_THRESHOLD_PERCENT) {
          // Flag as suspicious but still allow the skip
          console.log(
            `⚠️ FALSE CLAIM: Driver ${req.user!.userId} claimed TRUCK_FULL at ${loadPercent.toFixed(1)}% load`
          );

          if (stop.route.supervisor) {
            await notifyFalseFullClaim(
              stop.route.supervisor.id,
              stop.route.driver.name,
              stop.route.vehicle.registration_no,
              Math.round(loadPercent)
            );
          }
        }
      }
    }

    // Update stop status
    const updated = await prisma.stop.update({
      where: { id: stopId },
      data: {
        status: StopStatus.SKIPPED,
        skip_reason: reason,
        skipped_at: new Date(),
      },
    });

    // ── FR-DRV-05: Auto-create backlog ──
    await createBacklogForSkippedStop(stopId, reason);

    // ── FR-CIT-02: Notify society citizens ──
    if (stop.society_id) {
      await notifySocietyOfSkip(stop.society_id, reason, "Next available shift");

      // ── FR-ADM-11: Auto-fine for WASTE_MIXED ──
      if (reason === SkipReason.WASTE_MIXED) {
        await createFineForMixedWaste(stop.society_id, stopId, req.user!.userId);
      }
    }

    await logAudit({
      actorId: req.user!.userId,
      action: "SKIP_STOP",
      entityType: "Stop",
      entityId: stopId,
      oldValue: { status: stop.status },
      newValue: { status: StopStatus.SKIPPED, skip_reason: reason, notes },
    });

    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/stops/:id/photos
 * Upload a geotagged photo for a stop.
 * Per PRD FR-DRV-09/10/11: camera-only, GPS + metadata tagged, geofence validated.
 */
export async function uploadPhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const stopId = getSingleValue(req.params.id)!;
    const { lat, lng } = req.body;

    const stop = await prisma.stop.findUniqueOrThrow({
      where: { id: stopId },
      include: {
        route: { select: { driver_id: true } },
      },
    });

    if (stop.route.driver_id !== req.user!.userId) {
      sendError(res, "You are not assigned to this stop.", 403, "STOP_ACCESS_DENIED");
      return;
    }

    // Geofence check
    const geofence = isWithinGeofence(lat, lng, stop.lat, stop.lng, env.GEOFENCE_RADIUS_METERS);

    if (!geofence.valid) {
      sendError(
        res,
        `Photo rejected. You are ${geofence.distanceMeters}m away from the stop (max ${env.GEOFENCE_RADIUS_METERS}m).`,
        400,
        "GEOFENCE_VIOLATION"
      );
      return;
    }

    // Get uploaded file path (multer)
    const file = req.file;
    if (!file) {
      sendError(res, "No photo file uploaded.", 400, "NO_FILE");
      return;
    }

    const photo = await prisma.stopPhoto.create({
      data: {
        stop_id: stopId,
        driver_id: req.user!.userId,
        url: `/uploads/${file.filename}`,
        lat,
        lng,
        geofence_valid: geofence.valid,
      },
    });

    sendSuccess(res, {
      photo,
      geofence: {
        valid: geofence.valid,
        distanceMeters: geofence.distanceMeters,
      },
    }, 201);
  } catch (err) {
    next(err);
  }
}
