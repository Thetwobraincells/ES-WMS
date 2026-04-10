import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { sendSuccess } from "../utils/apiResponse";

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
