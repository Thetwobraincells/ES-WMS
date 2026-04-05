import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { sendSuccess, sendCreated, sendError } from "../utils/apiResponse";
import { getSingleValue } from "../utils/request";
import { logAudit } from "../services/audit.service";

// ─── Validation Schemas ─────────────────────────────────────────────────────

export const complaintSchema = z.object({
  description: z.string().min(10).max(1000),
  photo_url: z.string().optional(),
});

// ─── Handlers ───────────────────────────────────────────────────────────────

/**
 * GET /api/v1/societies/:id/status
 * Get today's collection status for a society.
 * Per PRD FR-CIT-01: today's scheduled pickup time, status, vehicle location.
 */
export async function getSocietyStatus(req: Request, res: Response, next: NextFunction) {
  try {
    const societyId = getSingleValue(req.params.id)!;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const society = await prisma.society.findUniqueOrThrow({
      where: { id: societyId },
      include: {
        stops: {
          where: {
            route: {
              date: { gte: today },
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
                driver: { select: { name: true } },
              },
            },
          },
          orderBy: { sequence_order: "asc" },
        },
      },
    });

    // Get the first stop for this society today
    const todayStop = society.stops[0];

    const response = {
      society: {
        id: society.id,
        name: society.name,
        address: society.address,
        wallet_balance: society.wallet_balance,
      },
      today: todayStop
        ? {
            stop_id: todayStop.id,
            status: todayStop.status,
            bin_type: todayStop.bin_type,
            skip_reason: todayStop.skip_reason,
            completed_at: todayStop.completed_at,
            skipped_at: todayStop.skipped_at,
            driver_name: todayStop.route.driver.name,
            vehicle: {
              registration_no: todayStop.route.vehicle.registration_no,
              position: todayStop.route.vehicle.telemetry[0]
                ? {
                    lat: todayStop.route.vehicle.telemetry[0].lat,
                    lng: todayStop.route.vehicle.telemetry[0].lng,
                  }
                : null,
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
    };

    sendSuccess(res, response);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/societies/:id/complaint
 * Submit a missed collection complaint.
 * Per PRD FR-CIT-03: citizen can submit report with mandatory photo.
 */
export async function submitComplaint(req: Request, res: Response, next: NextFunction) {
  try {
    const societyId = getSingleValue(req.params.id)!;
    const { description, photo_url } = req.body;

    // Create as a notification / audit entry for now
    // In future, this could be a dedicated complaints table
    await logAudit({
      actorId: req.user!.userId,
      action: "SUBMIT_COMPLAINT",
      entityType: "Society",
      entityId: societyId,
      newValue: { description, photo_url },
    });

    sendCreated(res, {
      message: "Complaint submitted successfully. The admin team will review it shortly.",
      society_id: societyId,
    });
  } catch (err) {
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
