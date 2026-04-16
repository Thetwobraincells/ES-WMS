import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { SkipReason, StopStatus } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { getSingleValue } from "../utils/request";
import { logAudit } from "../services/audit.service";
import { createBacklogForSkippedStop } from "../services/backlog.service";
import { createFineForMixedWaste } from "../services/fine.service";
import { isWithinGeofence } from "../services/geofence.service";
import { notifySocietyOfSkip, notifyFalseFullClaim } from "../services/notification.service";
import { getSetting } from "../services/settings.service";
import {
  checkInaccessibleFrequency,
  checkConsecutiveNonSegregation,
  createFalseTruckFullAlert,
} from "../services/alert.service";

export const skipStopSchema = z.object({
  reason: z.nativeEnum(SkipReason),
  notes: z.string().optional(),
});

export const uploadPhotoSchema = z.object({
  lat: z.coerce.number(),
  lng: z.coerce.number(),
});

/**
 * GET /api/v1/stops
 * List stops for admin map layer and operations views.
 */
export async function listStops(req: Request, res: Response, next: NextFunction) {
  try {
    const stops = await prisma.stop.findMany({
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        route_id: true,
        society_id: true,
        address: true,
        lat: true,
        lng: true,
        status: true,
        skip_reason: true,
        created_at: true,
      },
    });
    sendSuccess(
      res,
      stops.map((stop) => ({
        ...stop,
        // Keep compatibility with current web payload contract.
        updated_at: stop.created_at,
      })),
    );
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/stops/:id/complete
 * Driver can mark complete only after uploading a valid proof photo.
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

    const validPhotos = stop.photos.filter((photo) => photo.geofence_valid);
    if (validPhotos.length === 0) {
      const geofenceRadiusMeters = await getSetting("GEOFENCE_RADIUS_METERS");
      sendError(
        res,
        `Cannot complete stop. Upload a geotagged photo taken within ${geofenceRadiusMeters}m of the stop first.`,
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
 * Skip stop with automatic backlog, notifications, and alerting.
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

    if (reason === SkipReason.TRUCK_FULL) {
      const truckFullThreshold = await getSetting("TRUCK_FULL_THRESHOLD_PERCENT");
      const latestTelemetry = await prisma.vehicleTelemetry.findFirst({
        where: { vehicle_id: stop.route.vehicle_id },
        orderBy: { recorded_at: "desc" },
      });

      if (latestTelemetry) {
        const loadPercent = (latestTelemetry.current_load_kg / stop.route.vehicle.capacity_kg) * 100;

        if (loadPercent < truckFullThreshold) {
          if (stop.route.supervisor) {
            await notifyFalseFullClaim(
              stop.route.supervisor.id,
              stop.route.driver.name,
              stop.route.vehicle.registration_no,
              Math.round(loadPercent)
            );
          }

          await createFalseTruckFullAlert({
            driverId: req.user!.userId,
            driverName: stop.route.driver.name,
            vehicleId: stop.route.vehicle.registration_no,
            loadPercent: Math.round(loadPercent),
          });

          await prisma.notification.create({
            data: {
              target_user_id: req.user!.userId,
              title: "Skip Flagged",
              body: `Your Truck Full claim was flagged. Current recorded load is ${Math.round(loadPercent)}%.`,
              type: "FALSE_CLAIM_ALERT"
            }
          });
        }
      }
    }

    const updated = await prisma.stop.update({
      where: { id: stopId },
      data: {
        status: StopStatus.SKIPPED,
        skip_reason: reason,
        skipped_at: new Date(),
      },
    });

    const backlog = await createBacklogForSkippedStop(stopId, reason);

    await prisma.notification.create({
      data: {
        target_user_id: req.user!.userId,
        title: "Stop Skipped",
        body: `Stop skipped. Reason: ${reason}. A backlog was generated.`,
        type: "SKIP_ALERT"
      }
    });

    if (stop.society_id) {
      await notifySocietyOfSkip(stop.society_id, reason, backlog.expectedPickupAt);

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
      newValue: {
        status: StopStatus.SKIPPED,
        skip_reason: reason,
        notes,
        backlog_id: backlog.backlogId,
      },
    });

    if (reason === SkipReason.INACCESSIBLE) {
      checkInaccessibleFrequency(req.user!.userId, stop.route.driver.name).catch(console.error);
    }
    if (reason === SkipReason.WASTE_MIXED && stop.society_id && stop.society) {
      checkConsecutiveNonSegregation(stop.society_id, stop.society.name).catch(console.error);
    }

    sendSuccess(res, {
      ...updated,
      backlog,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/stops/:id/photos
 * Upload a geotagged photo for a stop.
 */
export async function uploadPhoto(req: Request, res: Response, next: NextFunction) {
  try {
    const stopId = getSingleValue(req.params.id)!;
    const { lat, lng } = req.body;
    const geofenceRadiusMeters = await getSetting("GEOFENCE_RADIUS_METERS");

    const stop = await prisma.stop.findUniqueOrThrow({
      where: { id: stopId },
      include: {
        route: {
          select: {
            driver_id: true,
            vehicle_id: true,
          },
        },
      },
    });

    if (stop.route.driver_id !== req.user!.userId) {
      sendError(res, "You are not assigned to this stop.", 403, "STOP_ACCESS_DENIED");
      return;
    }

    const geofence = isWithinGeofence(lat, lng, stop.lat, stop.lng, geofenceRadiusMeters);
    if (!geofence.valid) {
      sendError(
        res,
        `Photo rejected. You are ${geofence.distanceMeters}m away from the stop (max ${geofenceRadiusMeters}m).`,
        400,
        "GEOFENCE_VIOLATION"
      );
      return;
    }

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

    sendSuccess(
      res,
      {
        photo,
        metadata: {
          stop_id: stopId,
          driver_id: req.user!.userId,
          vehicle_id: stop.route.vehicle_id,
          timestamp: photo.taken_at,
        },
        geofence: {
          valid: geofence.valid,
          distanceMeters: geofence.distanceMeters,
        },
      },
      201
    );
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/stops/map
 * All stops across today's active routes for admin map layer.
 */
export async function getAllActiveStops(req: Request, res: Response, next: NextFunction) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const stops = await prisma.stop.findMany({
      where: {
        route: {
          is_active: true,
          date: { gte: today },
        },
      },
      select: {
        id: true,
        address: true,
        lat: true,
        lng: true,
        status: true,
        bin_type: true,
        sequence_order: true,
        skip_reason: true,
        photos: {
          select: {
            id: true,
            url: true,
            taken_at: true,
            geofence_valid: true,
          },
          orderBy: { taken_at: "desc" },
        },
        society: { select: { name: true } },
        route: {
          select: {
            id: true,
            driver: { select: { name: true } },
            vehicle: { select: { registration_no: true } },
          },
        },
      },
      orderBy: [{ route_id: "asc" }, { sequence_order: "asc" }],
    });

    sendSuccess(res, stops);
  } catch (err) {
    next(err);
  }
}
