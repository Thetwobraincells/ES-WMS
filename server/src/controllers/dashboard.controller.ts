import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { sendSuccess } from "../utils/apiResponse";
import { getSingleValue } from "../utils/request";

/**
 * GET /api/v1/admin/dashboard
 * Aggregated dashboard metrics for the ICCC admin web dashboard.
 * Per PRD FR-ADM-01 through FR-ADM-17.
 */
export async function getDashboardSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Parallel queries for all dashboard stats
    const [
      activeRoutes,
      totalStopsToday,
      completedStopsToday,
      skippedStopsToday,
      pendingBacklogs,
      pendingFines,
      totalSocieties,
      activeVehicles,
      recentComplaints,
    ] = await Promise.all([
      prisma.route.count({ where: { is_active: true, date: { gte: today } } }),
      prisma.stop.count({ where: { route: { date: { gte: today }, is_active: true } } }),
      prisma.stop.count({ where: { status: "COMPLETED", route: { date: { gte: today }, is_active: true } } }),
      prisma.stop.count({ where: { status: "SKIPPED", route: { date: { gte: today }, is_active: true } } }),
      prisma.backlogEntry.count({ where: { status: "PENDING" } }),
      prisma.fineEvent.count({ where: { status: "PENDING" } }),
      prisma.society.count(),
      prisma.vehicle.count({ where: { is_active: true } }),
      prisma.auditLog.count({
        where: {
          action: "SUBMIT_COMPLAINT",
          created_at: { gte: today },
        },
      }),
    ]);

    const completionPercent = totalStopsToday > 0
      ? Math.round((completedStopsToday / totalStopsToday) * 100)
      : 0;

    sendSuccess(res, {
      date: today.toISOString().split("T")[0],
      routes: {
        active: activeRoutes,
      },
      stops: {
        total: totalStopsToday,
        completed: completedStopsToday,
        skipped: skippedStopsToday,
        pending: totalStopsToday - completedStopsToday - skippedStopsToday,
        completion_percent: completionPercent,
      },
      backlogs: {
        pending: pendingBacklogs,
      },
      fines: {
        pending: pendingFines,
      },
      societies: {
        total: totalSocieties,
        complaints_today: recentComplaints,
      },
      vehicles: {
        active: activeVehicles,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/wards
 * List all wards (for dropdowns & filters in admin dashboard).
 */
export async function listWards(req: Request, res: Response, next: NextFunction) {
  try {
    const wards = await prisma.ward.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            societies: true,
            routes: true,
            users: true,
          },
        },
      },
    });

    sendSuccess(res, wards);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/heatmap/skips
 * Aggregated skip frequency by stop location for heatmap visualization.
 * Per PRD FR-ADM-05: heatmap of historically skipped stops.
 */
export async function getSkipHeatmap(req: Request, res: Response, next: NextFunction) {
  try {
    const daysParam = getSingleValue(req.query.days);
    const days = daysParam ? parseInt(daysParam, 10) : 30;
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Group skipped stops by address/lat/lng and count frequency
    const skippedStops = await prisma.stop.findMany({
      where: {
        status: "SKIPPED",
        skipped_at: { gte: since },
      },
      select: {
        lat: true,
        lng: true,
        address: true,
        skip_reason: true,
        society: { select: { name: true } },
      },
    });

    // Aggregate by location (round to 5 decimal places ~1m accuracy)
    const locationMap = new Map<string, {
      lat: number;
      lng: number;
      address: string;
      society_name: string | null;
      count: number;
      reasons: Record<string, number>;
    }>();

    for (const stop of skippedStops) {
      const key = `${stop.lat.toFixed(5)},${stop.lng.toFixed(5)}`;
      const existing = locationMap.get(key);

      if (existing) {
        existing.count++;
        if (stop.skip_reason) {
          existing.reasons[stop.skip_reason] = (existing.reasons[stop.skip_reason] || 0) + 1;
        }
      } else {
        const reasons: Record<string, number> = {};
        if (stop.skip_reason) reasons[stop.skip_reason] = 1;

        locationMap.set(key, {
          lat: stop.lat,
          lng: stop.lng,
          address: stop.address,
          society_name: stop.society?.name ?? null,
          count: 1,
          reasons,
        });
      }
    }

    const heatmapData = Array.from(locationMap.values()).sort((a, b) => b.count - a.count);

    sendSuccess(res, {
      period_days: days,
      total_skips: skippedStops.length,
      hotspots: heatmapData,
    });
  } catch (err) {
    next(err);
  }
}
