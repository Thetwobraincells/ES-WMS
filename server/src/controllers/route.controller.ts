import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { sendSuccess, sendCreated, sendError } from "../utils/apiResponse";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { getSingleValue } from "../utils/request";
import { logAudit } from "../services/audit.service";
import { Shift, UserRole } from "@prisma/client";

// ─── Validation Schemas ─────────────────────────────────────────────────────

export const createRouteSchema = z.object({
  ward_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid(),
  supervisor_id: z.string().uuid().optional(),
  shift: z.nativeEnum(Shift),
  date: z.string().optional(),
  is_active: z.boolean().default(true),
});

export const updateRouteSchema = createRouteSchema.partial();

// ─── Handlers ───────────────────────────────────────────────────────────────

/**
 * GET /api/v1/routes/my-route
 * Get the current shift route for the logged-in driver.
 * Per PRD FR-DRV-01: driver sees assigned route on app launch.
 */
export async function getMyRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const userRole = req.user!.role;
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(startOfToday);
    endOfToday.setDate(endOfToday.getDate() + 1);

    const currentHour = new Date().getHours();
    const currentShift = currentHour < 14 ? Shift.AM : Shift.PM;

    const routeIncludes = {
      vehicle: {
        include: {
          telemetry: {
            orderBy: { recorded_at: "desc" as const },
            take: 1,
          },
        },
      },
      stops: {
        orderBy: { sequence_order: "asc" as const },
        include: {
          society: { select: { name: true, address: true } },
          photos: { select: { id: true, url: true, geofence_valid: true } },
        },
      },
      ward: { select: { name: true } },
      supervisor: { select: { id: true, name: true, mobile: true } },
    };

    const routeOwnerFilter =
      userRole === UserRole.SUPERVISOR
        ? { supervisor_id: userId }
        : { driver_id: userId };

    let route = await prisma.route.findFirst({
      where: {
        ...routeOwnerFilter,
        date: { gte: startOfToday, lt: endOfToday },
        shift: currentShift,
        is_active: true,
      },
      orderBy: { created_at: "desc" },
      include: routeIncludes,
    });

    if (!route) {
      route = await prisma.route.findFirst({
        where: {
          ...routeOwnerFilter,
          date: { gte: startOfToday, lt: endOfToday },
          is_active: true,
        },
        orderBy: [{ date: "desc" }, { created_at: "desc" }],
        include: routeIncludes,
      });
    }

    if (!route) {
      sendError(res, "No active route found for your current shift.", 404, "ROUTE_NOT_FOUND");
      return;
    }

    // Compute route progress stats
    const totalStops = route.stops.length;
    const completedStops = route.stops.filter((s) => s.status === "COMPLETED").length;
    const skippedStops = route.stops.filter((s) => s.status === "SKIPPED").length;
    const latestTelemetry = route.vehicle.telemetry[0];
    const { telemetry, ...vehicle } = route.vehicle;

    sendSuccess(res, {
      ...route,
      vehicle: {
        ...vehicle,
        current_load_kg: latestTelemetry?.current_load_kg ?? 0,
        load_percent: latestTelemetry
          ? Math.round((latestTelemetry.current_load_kg / route.vehicle.capacity_kg) * 100)
          : 0,
        status: latestTelemetry?.status ?? "IDLE",
        last_update: latestTelemetry?.recorded_at ?? null,
      },
      progress: {
        total: totalStops,
        completed: completedStops,
        skipped: skippedStops,
        pending: totalStops - completedStops - skippedStops,
        percentage: totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/routes
 * List all routes (admin). Supports pagination and filtering.
 */
export async function listRoutes(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = getPagination(req);
    const wardId = getSingleValue(req.query.ward_id);
    const shift = getSingleValue(req.query.shift) as Shift | undefined;

    const where: Record<string, unknown> = {};
    if (wardId) where.ward_id = wardId;
    if (shift) where.shift = shift;

    const [routes, total] = await Promise.all([
      prisma.route.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          ward: { select: { name: true } },
          vehicle: { select: { registration_no: true } },
          driver: { select: { name: true } },
          supervisor: { select: { name: true } },
          _count: { select: { stops: true } },
        },
      }),
      prisma.route.count({ where }),
    ]);

    sendSuccess(res, routes, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/routes/:id
 * Get a single route by ID with all stops.
 */
export async function getRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const routeId = getSingleValue(req.params.id)!;
    const route = await prisma.route.findUniqueOrThrow({
      where: { id: routeId },
      include: {
        ward: true,
        vehicle: true,
        driver: { select: { id: true, name: true, mobile: true } },
        supervisor: { select: { id: true, name: true, mobile: true } },
        stops: { orderBy: { sequence_order: "asc" }, include: { society: true } },
      },
    });

    sendSuccess(res, route);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/routes
 * Create a new route (admin only).
 */
export async function createRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body;
    const route = await prisma.route.create({
      data: {
        ward_id: data.ward_id,
        vehicle_id: data.vehicle_id,
        driver_id: data.driver_id,
        supervisor_id: data.supervisor_id,
        shift: data.shift,
        date: data.date ? new Date(data.date) : new Date(),
        is_active: data.is_active,
      },
      include: { ward: true, vehicle: true, driver: true },
    });

    await logAudit({
      actorId: req.user!.userId,
      action: "CREATE_ROUTE",
      entityType: "Route",
      entityId: route.id,
      newValue: data,
    });

    sendCreated(res, route);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/routes/:id
 * Update a route (admin only).
 */
export async function updateRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const routeId = getSingleValue(req.params.id)!;
    const old = await prisma.route.findUniqueOrThrow({ where: { id: routeId } });

    const route = await prisma.route.update({
      where: { id: routeId },
      data: req.body,
      include: { ward: true, vehicle: true, driver: true },
    });

    await logAudit({
      actorId: req.user!.userId,
      action: "UPDATE_ROUTE",
      entityType: "Route",
      entityId: route.id,
      oldValue: old as unknown as Record<string, unknown>,
      newValue: req.body,
    });

    sendSuccess(res, route);
  } catch (err) {
    next(err);
  }
}
