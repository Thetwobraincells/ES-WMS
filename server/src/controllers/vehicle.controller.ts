import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { sendSuccess } from "../utils/apiResponse";
import { getPagination, buildPaginationMeta } from "../utils/pagination";

/**
 * GET /api/v1/vehicles/live
 * Get all active vehicle positions for the live map.
 * Per PRD FR-ADM-01: shows all active vehicles with latest telemetry.
 */
export async function getLiveVehicles(req: Request, res: Response, next: NextFunction) {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: { is_active: true },
      include: {
        telemetry: {
          orderBy: { recorded_at: "desc" },
          take: 1,
        },
        routes: {
          where: { is_active: true },
          take: 1,
          include: {
            driver: { select: { id: true, name: true } },
            _count: { select: { stops: true } },
            stops: {
              select: { id: true, lat: true, lng: true, sequence_order: true, status: true, address: true },
              orderBy: { sequence_order: "asc" },
            },
          },
        },
      },
    });

    // Transform for map consumption
    const liveData = vehicles.map((v) => {
      const latest = v.telemetry[0];
      const activeRoute = v.routes[0];
      const completedStops = activeRoute?.stops.filter((s) => s.status === "COMPLETED").length ?? 0;
      const totalStops = activeRoute?.stops.length ?? 0;

      return {
        id: v.id,
        registration_no: v.registration_no,
        capacity_kg: v.capacity_kg,
        position: latest
          ? { lat: latest.lat, lng: latest.lng }
          : null,
        current_load_kg: latest?.current_load_kg ?? 0,
        load_percent: latest
          ? Math.round((latest.current_load_kg / v.capacity_kg) * 100)
          : 0,
        status: latest?.status ?? "IDLE",
        last_update: latest?.recorded_at ?? null,
        driver: activeRoute?.driver ?? null,
        route_id: activeRoute?.id ?? null,
        route_progress: {
          completed: completedStops,
          total: totalStops,
        },
        route_stops: (activeRoute?.stops ?? []).map((s) => ({
          id: s.id,
          lat: s.lat,
          lng: s.lng,
          sequence_order: s.sequence_order,
          status: s.status,
          address: s.address,
        })),
      };
    });

    sendSuccess(res, liveData);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/vehicles
 * List all vehicles (admin).
 */
export async function listVehicles(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = getPagination(req);

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        skip,
        take: limit,
        orderBy: { registration_no: "asc" },
      }),
      prisma.vehicle.count(),
    ]);

    sendSuccess(res, vehicles, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}
