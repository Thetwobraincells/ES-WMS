import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { sendSuccess, sendCreated, sendError } from "../utils/apiResponse";
import { getSingleValue } from "../utils/request";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { logAudit } from "../services/audit.service";
import { haversineDistance } from "../services/geofence.service";

export const complaintSchema = z.object({
  description: z.string().min(10).max(1000),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

function getShiftStartTime(routeDate: Date, shift: "AM" | "PM") {
  const scheduled = new Date(routeDate);
  scheduled.setHours(shift === "AM" ? 6 : 14, 0, 0, 0);
  return scheduled;
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

async function ensureCitizenSocietyAccess(req: Request, societyId: string) {
  if (req.user!.role !== UserRole.CITIZEN) {
    return;
  }

  const membership = await prisma.societyMember.findFirst({
    where: {
      user_id: req.user!.userId,
      society_id: societyId,
    },
  });

  if (!membership) {
    throw new Error("SOCIETY_ACCESS_DENIED");
  }
}

/**
 * GET /api/v1/societies/:id/status
 * Today's collection status for a society.
 */
export async function getSocietyStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const societyId = getSingleValue(req.params.id)!;
    await ensureCitizenSocietyAccess(req, societyId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const society = await prisma.society.findUniqueOrThrow({
      where: { id: societyId },
      include: {
        stops: {
          where: {
            route: {
              date: { gte: today, lt: tomorrow },
              is_active: true,
            },
          },
          include: {
            route: {
              include: {
                vehicle: {
                  include: {
                    telemetry: {
                      orderBy: { recorded_at: "desc" },
                      take: 1,
                    },
                  },
                },
                driver: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { sequence_order: "asc" },
        },
      },
    });

    const todayStop = society.stops[0];
    const complianceScore = await computeComplianceScore(societyId);

    let vehiclePosition: { lat: number; lng: number } | null = null;
    let vehicleDistanceMeters: number | null = null;
    let scheduledPickupTime: string | null = null;

    if (todayStop) {
      const telemetry = todayStop.route.vehicle.telemetry[0];
      scheduledPickupTime = addMinutes(
        getShiftStartTime(todayStop.route.date, todayStop.route.shift),
        Math.max(todayStop.sequence_order - 1, 0) * 15
      ).toISOString();

      if (telemetry) {
        const distance = haversineDistance(telemetry.lat, telemetry.lng, society.lat, society.lng);
        vehicleDistanceMeters = Math.round(distance);

        if (distance <= 500) {
          vehiclePosition = {
            lat: telemetry.lat,
            lng: telemetry.lng,
          };
        }
      }
    }

    sendSuccess(res, {
      society: {
        id: society.id,
        name: society.name,
        address: society.address,
        wallet_balance: society.wallet_balance,
        compliance_score: complianceScore.score,
      },
      today: todayStop
        ? {
            stop_id: todayStop.id,
            scheduled_pickup_time: scheduledPickupTime,
            status: todayStop.status,
            bin_type: todayStop.bin_type,
            skip_reason: todayStop.skip_reason,
            completed_at: todayStop.completed_at,
            skipped_at: todayStop.skipped_at,
            driver: todayStop.route.driver,
            vehicle: {
              id: todayStop.route.vehicle.id,
              registration_no: todayStop.route.vehicle.registration_no,
              live_location: vehiclePosition,
              distance_to_society_meters: vehicleDistanceMeters,
              load_percent: todayStop.route.vehicle.telemetry[0]
                ? Math.round(
                    (todayStop.route.vehicle.telemetry[0].current_load_kg /
                      todayStop.route.vehicle.capacity_kg) *
                      100
                  )
                : 0,
            },
          }
        : null,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "SOCIETY_ACCESS_DENIED") {
      sendError(res, "You can only access your mapped society.", 403, "FORBIDDEN");
      return;
    }
    next(err);
  }
}

/**
 * POST /api/v1/societies/:id/complaint
 * Complaint with mandatory photo when today's stop is marked completed.
 */
export async function submitComplaint(req: Request, res: Response, next: NextFunction) {
  try {
    const societyId = getSingleValue(req.params.id)!;
    await ensureCitizenSocietyAccess(req, societyId);

    const { description, lat, lng } = req.body;
    if (!req.file) {
      sendError(res, "A complaint photo is required.", 400, "PHOTO_REQUIRED");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const completedStop = await prisma.stop.findFirst({
      where: {
        society_id: societyId,
        status: "COMPLETED",
        route: {
          date: { gte: today, lt: tomorrow },
          is_active: true,
        },
      },
      orderBy: { completed_at: "desc" },
    });

    if (!completedStop) {
      sendError(
        res,
        "A missed collection complaint can only be raised after today's stop is marked COMPLETED.",
        400,
        "STOP_NOT_COMPLETED"
      );
      return;
    }

    const photoUrl = `/uploads/${req.file.filename}`;

    await logAudit({
      actorId: req.user!.userId,
      action: "SUBMIT_COMPLAINT",
      entityType: "Society",
      entityId: societyId,
      newValue: {
        stop_id: completedStop.id,
        description,
        photo_url: photoUrl,
        geotag: lat !== undefined && lng !== undefined ? { lat, lng } : null,
      },
    });

    sendCreated(res, {
      message: "Complaint submitted successfully. The admin team will review it shortly.",
      society_id: societyId,
      stop_id: completedStop.id,
      photo_url: photoUrl,
      geotag: lat !== undefined && lng !== undefined ? { lat, lng } : null,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "SOCIETY_ACCESS_DENIED") {
      sendError(res, "You can only access your mapped society.", 403, "FORBIDDEN");
      return;
    }
    next(err);
  }
}

/**
 * GET /api/v1/societies
 * List all societies (admin).
 */
export async function listSocieties(req: Request, res: Response, next: NextFunction) {
  try {
    const societies = await prisma.society.findMany({
      include: {
        ward: { select: { name: true } },
        _count: { select: { fine_events: true, members: true } },
      },
      orderBy: { name: "asc" },
    });

    sendSuccess(res, societies);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/societies/:id/fines
 * Fine history visible to mapped society members.
 */
export async function getSocietyFines(req: Request, res: Response, next: NextFunction) {
  try {
    const societyId = getSingleValue(req.params.id)!;
    await ensureCitizenSocietyAccess(req, societyId);

    const { page, limit, skip } = getPagination(req);

    const [fines, total, society] = await Promise.all([
      prisma.fineEvent.findMany({
        where: { society_id: societyId },
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          reason: true,
          amount: true,
          status: true,
          notes: true,
          created_at: true,
          stop: {
            select: {
              address: true,
              bin_type: true,
            },
          },
        },
      }),
      prisma.fineEvent.count({ where: { society_id: societyId } }),
      prisma.society.findUniqueOrThrow({
        where: { id: societyId },
        select: { wallet_balance: true },
      }),
    ]);

    sendSuccess(
      res,
      { wallet_balance: society.wallet_balance, fines },
      200,
      buildPaginationMeta(page, limit, total)
    );
  } catch (err) {
    if (err instanceof Error && err.message === "SOCIETY_ACCESS_DENIED") {
      sendError(res, "You can only access your mapped society.", 403, "FORBIDDEN");
      return;
    }
    next(err);
  }
}

/**
 * GET /api/v1/societies/:id/compliance
 * Segregation compliance score for a society.
 */
export async function getSocietyComplianceEndpoint(req: Request, res: Response, next: NextFunction) {
  try {
    const societyId = getSingleValue(req.params.id)!;
    await ensureCitizenSocietyAccess(req, societyId);

    const score = await computeComplianceScore(societyId);
    const society = await prisma.society.findUniqueOrThrow({
      where: { id: societyId },
      select: { name: true },
    });

    sendSuccess(res, {
      society_id: societyId,
      society_name: society.name,
      compliance_score: score.score,
      details: score,
    });
  } catch (err) {
    if (err instanceof Error && err.message === "SOCIETY_ACCESS_DENIED") {
      sendError(res, "You can only access your mapped society.", 403, "FORBIDDEN");
      return;
    }
    next(err);
  }
}

async function computeComplianceScore(societyId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const stops = await prisma.stop.findMany({
    where: {
      society_id: societyId,
      route: {
        date: { gte: thirtyDaysAgo },
      },
    },
    select: {
      status: true,
      skip_reason: true,
    },
  });

  const totalStops = stops.length;
  if (totalStops === 0) {
    return { score: 100, total_stops: 0, completed: 0, mixed_waste_violations: 0 };
  }

  const completed = stops.filter((s) => s.status === "COMPLETED").length;
  const mixedWasteViolations = stops.filter(
    (s) => s.status === "SKIPPED" && s.skip_reason === "WASTE_MIXED"
  ).length;

  const relevantStops = completed + mixedWasteViolations;
  if (relevantStops === 0) {
    return { score: 100, total_stops: totalStops, completed, mixed_waste_violations: mixedWasteViolations };
  }

  const rawScore = ((completed - mixedWasteViolations) / relevantStops) * 100;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return {
    score,
    total_stops: totalStops,
    completed,
    mixed_waste_violations: mixedWasteViolations,
    period_days: 30,
  };
}
