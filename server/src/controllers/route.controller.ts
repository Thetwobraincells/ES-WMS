import { Request, Response, NextFunction } from "express";
import { Prisma, Shift, UserRole } from "@prisma/client";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { sendSuccess, sendCreated, sendError } from "../utils/apiResponse";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { getSingleValue } from "../utils/request";
import { logAudit } from "../services/audit.service";

const routeStopSchema = z.object({
  id: z.string().uuid().optional(),
  society_id: z.string().uuid().nullable().optional(),
  address: z.string().min(3).max(255),
  lat: z.number(),
  lng: z.number(),
  bin_type: z.enum(["WET", "DRY", "MIXED"]),
  sequence_order: z.number().int().positive(),
});

export const createRouteSchema = z.object({
  ward_id: z.string().min(1),
  vehicle_id: z.string().min(1),
  driver_id: z.string().min(1),
  supervisor_id: z.string().optional().or(z.literal("")),
  shift: z.nativeEnum(Shift),
  date: z.string().optional(),
  is_active: z.boolean().default(true),
  stops: z.array(routeStopSchema).optional(),
}).passthrough();

export const updateRouteSchema = createRouteSchema.partial().extend({
  deleteStopIds: z.array(z.string().uuid()).optional(),
});

export const addStopSchema = z.object({
  society_id: z.string().uuid().nullable().optional(),
  address: z.string().min(3).max(255),
  lat: z.number(),
  lng: z.number(),
  bin_type: z.enum(["WET", "DRY", "MIXED"]),
  sequence_order: z.number().int().positive(),
});

function buildRouteIncludes() {
  return {
    ward: true,
    vehicle: true,
    driver: { select: { id: true, name: true, mobile: true } },
    supervisor: { select: { id: true, name: true, mobile: true } },
    stops: {
      orderBy: { sequence_order: "asc" as const },
      include: {
        society: true,
        photos: {
          orderBy: { taken_at: "desc" as const },
          select: {
            id: true,
            url: true,
            lat: true,
            lng: true,
            taken_at: true,
            geofence_valid: true,
            driver: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    },
  };
}

function mapRouteProgress(stops: Array<{ status: string }>) {
  const totalStops = stops.length;
  const completedStops = stops.filter((s) => s.status === "COMPLETED").length;
  const skippedStops = stops.filter((s) => s.status === "SKIPPED").length;

  return {
    total: totalStops,
    completed: completedStops,
    skipped: skippedStops,
    pending: totalStops - completedStops - skippedStops,
    percentage: totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0,
  };
}

async function upsertRouteStops(routeId: string, stops: z.infer<typeof routeStopSchema>[]) {
  for (const stop of stops) {
    const stopData = {
      society_id: stop.society_id ?? null,
      address: stop.address,
      lat: stop.lat,
      lng: stop.lng,
      bin_type: stop.bin_type,
      sequence_order: stop.sequence_order,
    };

    if (stop.id) {
      await prisma.stop.update({
        where: { id: stop.id },
        data: stopData,
      });
      continue;
    }

    await prisma.stop.create({
      data: {
        route_id: routeId,
        ...stopData,
      },
    });
  }
}

/**
 * GET /api/v1/routes/my-route
 * Current route for driver or supervisor.
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
      include: {
        vehicle: {
          include: {
            telemetry: {
              orderBy: { recorded_at: "desc" },
              take: 1,
            },
          },
        },
        stops: {
          orderBy: { sequence_order: "asc" },
          include: {
            society: { select: { name: true, address: true } },
            photos: { select: { id: true, url: true, geofence_valid: true } },
          },
        },
        ward: { select: { name: true } },
        supervisor: { select: { id: true, name: true, mobile: true } },
      },
    });

    if (!route) {
      route = await prisma.route.findFirst({
        where: {
          ...routeOwnerFilter,
          date: { gte: startOfToday, lt: endOfToday },
          is_active: true,
        },
        orderBy: [{ date: "desc" }, { created_at: "desc" }],
        include: {
          vehicle: {
            include: {
              telemetry: {
                orderBy: { recorded_at: "desc" },
                take: 1,
              },
            },
          },
          stops: {
            orderBy: { sequence_order: "asc" },
            include: {
              society: { select: { name: true, address: true } },
              photos: { select: { id: true, url: true, geofence_valid: true } },
            },
          },
          ward: { select: { name: true } },
          supervisor: { select: { id: true, name: true, mobile: true } },
        },
      });
    }

    if (!route) {
      route = await prisma.route.findFirst({
        where: {
          ...routeOwnerFilter,
          is_active: true,
        },
        orderBy: [{ date: "desc" }, { created_at: "desc" }],
        include: {
          vehicle: {
            include: {
              telemetry: {
                orderBy: { recorded_at: "desc" },
                take: 1,
              },
            },
          },
          stops: {
            orderBy: { sequence_order: "asc" },
            include: {
              society: { select: { name: true, address: true } },
              photos: { select: { id: true, url: true, geofence_valid: true } },
            },
          },
          ward: { select: { name: true } },
          supervisor: { select: { id: true, name: true, mobile: true } },
        },
      });
    }

    if (!route) {
      sendError(res, "No active route found for your current shift.", 404, "ROUTE_NOT_FOUND");
      return;
    }

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
      progress: mapRouteProgress(route.stops),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/routes
 * List all routes (admin).
 */
export async function listRoutes(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = getPagination(req);
    const wardId = getSingleValue(req.query.ward_id);
    const shift = getSingleValue(req.query.shift) as Shift | undefined;

    const where: Prisma.RouteWhereInput = {};
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
 * Route details including proof photos for admin/supervisor review.
 */
export async function getRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const routeId = getSingleValue(req.params.id)!;
    const route = await prisma.route.findUniqueOrThrow({
      where: { id: routeId },
      include: buildRouteIncludes(),
    });

    sendSuccess(res, {
      ...route,
      progress: mapRouteProgress(route.stops),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/routes
 * Create a route with optional ordered stops.
 */
export async function createRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const { stops = [], ...data } = req.body as z.infer<typeof createRouteSchema>;

    const route = await prisma.route.create({
      data: {
        ward_id: data.ward_id,
        vehicle_id: data.vehicle_id,
        driver_id: data.driver_id,
        supervisor_id: data.supervisor_id,
        shift: data.shift,
        date: data.date ? new Date(data.date) : new Date(),
        is_active: data.is_active,
        stops: stops.length
          ? {
              create: stops.map((stop) => ({
                society_id: stop.society_id ?? null,
                address: stop.address,
                lat: stop.lat,
                lng: stop.lng,
                bin_type: stop.bin_type,
                sequence_order: stop.sequence_order,
              })),
            }
          : undefined,
      },
      include: buildRouteIncludes(),
    });

    await logAudit({
      actorId: req.user!.userId,
      action: "CREATE_ROUTE",
      entityType: "Route",
      entityId: route.id,
      newValue: data,
    });

    sendCreated(res, {
      ...route,
      progress: mapRouteProgress(route.stops),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/routes/:id
 * Update a route and optionally upsert stop ordering/details.
 */
export async function updateRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const routeId = getSingleValue(req.params.id)!;
    const { stops, deleteStopIds, ...data } = req.body as z.infer<typeof updateRouteSchema>;
    const old = await prisma.route.findUniqueOrThrow({
      where: { id: routeId },
      include: {
        stops: {
          orderBy: { sequence_order: "asc" },
        },
      },
    });

    await prisma.route.update({
      where: { id: routeId },
      data: {
        ...(data.ward_id !== undefined ? { ward_id: data.ward_id } : {}),
        ...(data.vehicle_id !== undefined ? { vehicle_id: data.vehicle_id } : {}),
        ...(data.driver_id !== undefined ? { driver_id: data.driver_id } : {}),
        ...(data.supervisor_id !== undefined ? { supervisor_id: data.supervisor_id } : {}),
        ...(data.shift !== undefined ? { shift: data.shift } : {}),
        ...(data.date !== undefined ? { date: new Date(data.date) } : {}),
        ...(data.is_active !== undefined ? { is_active: data.is_active } : {}),
      },
    });

    // Delete stops that admin removed
    if (deleteStopIds?.length) {
      await prisma.stop.deleteMany({
        where: {
          id: { in: deleteStopIds },
          route_id: routeId,
          status: "PENDING", // Only delete pending stops (safety)
        },
      });
    }

    if (stops?.length) {
      await upsertRouteStops(routeId, stops);
    }

    const route = await prisma.route.findUniqueOrThrow({
      where: { id: routeId },
      include: buildRouteIncludes(),
    });

    await logAudit({
      actorId: req.user!.userId,
      action: "UPDATE_ROUTE",
      entityType: "Route",
      entityId: route.id,
      oldValue: old,
      newValue: req.body,
    });

    sendSuccess(res, {
      ...route,
      progress: mapRouteProgress(route.stops),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/routes/zone
 * Active routes for a supervisor's ward.
 */
export async function getZoneRoutes(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.user!.userId;
    const user = await prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { ward_id: true },
    });

    if (!user.ward_id) {
      sendError(res, "No ward assigned to your account. Contact admin.", 400, "NO_WARD");
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const routes = await prisma.route.findMany({
      where: {
        ward_id: user.ward_id,
        is_active: true,
        date: { gte: today, lt: tomorrow },
      },
      include: {
        vehicle: {
          include: {
            telemetry: {
              orderBy: { recorded_at: "desc" },
              take: 1,
            },
          },
        },
        driver: { select: { id: true, name: true, mobile: true } },
        supervisor: { select: { id: true, name: true } },
        stops: {
          orderBy: { sequence_order: "asc" },
          include: {
            society: { select: { name: true } },
            photos: {
              select: {
                id: true,
                url: true,
                geofence_valid: true,
              },
            },
          },
        },
        ward: { select: { name: true } },
      },
      orderBy: { created_at: "desc" },
    });

    const enrichedRoutes = routes.map((route) => {
      const latestTelemetry = route.vehicle.telemetry[0];

      return {
        ...route,
        vehicle: {
          ...route.vehicle,
          telemetry: undefined,
          current_load_kg: latestTelemetry?.current_load_kg ?? 0,
          load_percent: latestTelemetry
            ? Math.round((latestTelemetry.current_load_kg / route.vehicle.capacity_kg) * 100)
            : 0,
          status: latestTelemetry?.status ?? "IDLE",
        },
        progress: mapRouteProgress(route.stops),
      };
    });

    sendSuccess(res, enrichedRoutes);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/routes/:id/history
 * Route audit history.
 */
export async function getRouteHistory(req: Request, res: Response, next: NextFunction) {
  try {
    const routeId = getSingleValue(req.params.id)!;
    const { page, limit, skip } = getPagination(req);

    const route = await prisma.route.findUniqueOrThrow({
      where: { id: routeId },
      include: {
        driver: { select: { name: true } },
        vehicle: { select: { registration_no: true } },
        ward: { select: { name: true } },
        stops: { select: { id: true, status: true } },
      },
    });

    const stopIds = route.stops.map((stop) => stop.id);
    const logWhere: Prisma.AuditLogWhereInput = {
      OR: [
        { entity_type: "Route", entity_id: routeId },
        ...(stopIds.length ? [{ entity_type: "Stop", entity_id: { in: stopIds } }] : []),
      ],
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where: logWhere,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          actor: { select: { name: true, role: true } },
        },
      }),
      prisma.auditLog.count({ where: logWhere }),
    ]);

    sendSuccess(
      res,
      {
        route: {
          id: route.id,
          driver: route.driver.name,
          vehicle: route.vehicle.registration_no,
          ward: route.ward.name,
          completion_rate: mapRouteProgress(route.stops).percentage,
          stats: mapRouteProgress(route.stops),
        },
        audit_logs: logs,
      },
      200,
      buildPaginationMeta(page, limit, total)
    );
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/routes/:id
 * Delete a route (admin only).
 */
export async function deleteRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const routeId = getSingleValue(req.params.id)!;
    const old = await prisma.route.findUniqueOrThrow({ where: { id: routeId } });

    await prisma.route.delete({ where: { id: routeId } });

    await logAudit({
      actorId: req.user!.userId,
      action: "DELETE_ROUTE",
      entityType: "Route",
      entityId: routeId,
      oldValue: old as unknown as Record<string, unknown>,
    });

    sendSuccess(res, { id: routeId });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/routes/:id/stops
 * Add a new stop to an existing route.
 */
export async function addStopToRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const routeId = getSingleValue(req.params.id)!;
    const body = req.body as z.infer<typeof addStopSchema>;

    // Verify route exists
    await prisma.route.findUniqueOrThrow({ where: { id: routeId } });

    const stop = await prisma.stop.create({
      data: {
        route_id: routeId,
        society_id: body.society_id ?? null,
        address: body.address,
        lat: body.lat,
        lng: body.lng,
        bin_type: body.bin_type,
        sequence_order: body.sequence_order,
      },
      include: {
        society: true,
      },
    });

    await logAudit({
      actorId: req.user!.userId,
      action: "ADD_STOP",
      entityType: "Stop",
      entityId: stop.id,
      newValue: body,
    });

    sendCreated(res, stop);
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/v1/routes/:id/stops/:stopId
 * Remove a stop from a route.
 */
export async function removeStopFromRoute(req: Request, res: Response, next: NextFunction) {
  try {
    const routeId = getSingleValue(req.params.id)!;
    const stopId = getSingleValue(req.params.stopId)!;

    const stop = await prisma.stop.findFirst({
      where: { id: stopId, route_id: routeId },
    });

    if (!stop) {
      sendError(res, "Stop not found on this route.", 404, "STOP_NOT_FOUND");
      return;
    }

    await prisma.stop.delete({ where: { id: stopId } });

    // Re-sequence remaining stops
    const remaining = await prisma.stop.findMany({
      where: { route_id: routeId },
      orderBy: { sequence_order: "asc" },
    });
    for (let i = 0; i < remaining.length; i++) {
      await prisma.stop.update({
        where: { id: remaining[i].id },
        data: { sequence_order: i + 1 },
      });
    }

    await logAudit({
      actorId: req.user!.userId,
      action: "REMOVE_STOP",
      entityType: "Stop",
      entityId: stopId,
      oldValue: stop as unknown as Record<string, unknown>,
    });

    sendSuccess(res, { id: stopId });
  } catch (err) {
    next(err);
  }
}
