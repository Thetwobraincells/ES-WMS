import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { UserRole } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { sendSuccess, sendCreated } from "../utils/apiResponse";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { getSingleValue } from "../utils/request";
import { hashPassword } from "../services/auth.service";
import { logAudit } from "../services/audit.service";
import { generatePdfBuffer } from "../services/export.service";
import { getSetting } from "../services/settings.service";
import { createMassBalanceDiscrepancyAlert } from "../services/alert.service";

export const createUserSchema = z.object({
  name: z.string().min(2).max(100),
  role: z.nativeEnum(UserRole),
  mobile: z.string().min(10).max(15).optional(),
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  ward_id: z.string().uuid().optional(),
  is_active: z.boolean().default(true),
});

export const updateUserSchema = createUserSchema.partial();

async function getMassBalanceReportData(dateStr: string) {
  const date = new Date(dateStr);
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);

  const varianceThreshold = await getSetting("MASS_BALANCE_VARIANCE_PERCENT");

  const vehicles = await prisma.vehicle.findMany({
    where: { is_active: true },
    include: {
      telemetry: {
        where: {
          recorded_at: { gte: date, lt: nextDay },
        },
        orderBy: { current_load_kg: "desc" },
        take: 1,
      },
    },
  });

  const massBalance = vehicles.map((vehicle) => {
    const peakLoad = vehicle.telemetry[0]?.current_load_kg ?? 0;
    const utilizationPercent = vehicle.telemetry[0]
      ? Math.round((vehicle.telemetry[0].current_load_kg / vehicle.capacity_kg) * 100)
      : 0;

    // FR-ADM-17: variance detection (collected vs capacity utilization)
    // Simple model: expected utilization based on average, flag if individual vehicle deviates
    const variancePercent = Math.abs(utilizationPercent - 100);
    const flagged = peakLoad > 0 && variancePercent > varianceThreshold;

    return {
      vehicle_id: vehicle.id,
      registration_no: vehicle.registration_no,
      capacity_kg: vehicle.capacity_kg,
      peak_load_kg: peakLoad,
      utilization_percent: utilizationPercent,
      variance_percent: variancePercent,
      flagged,
    };
  });

  const totalCollected = massBalance.reduce((sum, v) => sum + v.peak_load_kg, 0);
  const flaggedVehicles = massBalance.filter((v) => v.flagged);

  // Create alerts for flagged vehicles (async, don't block)
  for (const flagged of flaggedVehicles) {
    createMassBalanceDiscrepancyAlert(
      flagged.registration_no,
      flagged.variance_percent,
      flagged.vehicle_id
    ).catch(console.error);
  }

  return {
    date: dateStr,
    vehicles: massBalance,
    summary: {
      total_collected_kg: totalCollected,
      total_capacity_kg: vehicles.reduce((sum, v) => sum + v.capacity_kg, 0),
      vehicle_count: vehicles.length,
      flagged_count: flaggedVehicles.length,
      variance_threshold_percent: varianceThreshold,
    },
  };
}

/**
 * GET /api/v1/admin/users
 * List all users.
 */
export async function listUsers(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = getPagination(req);
    const role = getSingleValue(req.query.role) as UserRole | undefined;

    const where: Record<string, unknown> = {};
    if (role) where.role = role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        select: {
          id: true,
          name: true,
          role: true,
          mobile: true,
          email: true,
          is_active: true,
          ward_id: true,
          created_at: true,
          ward: { select: { name: true } },
        },
      }),
      prisma.user.count({ where }),
    ]);

    sendSuccess(res, users, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/users
 * Create a new user.
 * Per PRD FR-AUTH-06.
 */
export async function createUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body;

    const password_hash = data.password ? await hashPassword(data.password) : undefined;

    const user = await prisma.user.create({
      data: {
        name: data.name,
        role: data.role,
        mobile: data.mobile,
        email: data.email,
        password_hash,
        ward_id: data.ward_id,
        is_active: data.is_active,
      },
      select: {
        id: true,
        name: true,
        role: true,
        mobile: true,
        email: true,
        is_active: true,
        created_at: true,
      },
    });

    await logAudit({
      actorId: req.user!.userId,
      action: "CREATE_USER",
      entityType: "User",
      entityId: user.id,
      newValue: { name: data.name, role: data.role },
    });

    sendCreated(res, user);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/users/:id
 * Update a user (suspend, deactivate, change role, etc.).
 */
export async function updateUser(req: Request, res: Response, next: NextFunction) {
  try {
    const data = req.body;
    const userId = getSingleValue(req.params.id)!;
    const old = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    const updateData: Record<string, unknown> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.mobile !== undefined) updateData.mobile = data.mobile;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.is_active !== undefined) updateData.is_active = data.is_active;
    if (data.ward_id !== undefined) updateData.ward_id = data.ward_id;
    if (data.password) updateData.password_hash = await hashPassword(data.password);

    const user = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        name: true,
        role: true,
        mobile: true,
        email: true,
        is_active: true,
        created_at: true,
      },
    });

    await logAudit({
      actorId: req.user!.userId,
      action: "UPDATE_USER",
      entityType: "User",
      entityId: user.id,
      oldValue: { name: old.name, role: old.role, is_active: old.is_active },
      newValue: data,
    });

    sendSuccess(res, user);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/mass-balance
 * Get mass balance data - collected vs. dumped.
 * Per PRD FR-ADM-16/17.
 */
export async function getMassBalance(req: Request, res: Response, next: NextFunction) {
  try {
    const dateStr = getSingleValue(req.query.date) ?? new Date().toISOString().split("T")[0];
    const report = await getMassBalanceReportData(dateStr);

    sendSuccess(res, report);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/mass-balance/export
 * Export daily mass balance report as PDF.
 */
export async function exportMassBalanceReport(req: Request, res: Response, next: NextFunction) {
  try {
    const dateStr = getSingleValue(req.query.date) ?? new Date().toISOString().split("T")[0];
    const report = await getMassBalanceReportData(dateStr);

    const pdfBuffer = await generatePdfBuffer(
      `Daily Mass Balance Report (${report.date})`,
      ["Vehicle ID", "Registration No", "Capacity (kg)", "Peak Load (kg)", "Utilization (%)"],
      report.vehicles.map((vehicle) => [
        vehicle.vehicle_id,
        vehicle.registration_no,
        vehicle.capacity_kg,
        vehicle.peak_load_kg,
        vehicle.utilization_percent,
      ])
    );

    await logAudit({
      actorId: req.user!.userId,
      action: "EXPORT_MASS_BALANCE",
      entityType: "Report",
      entityId: report.date,
      newValue: {
        vehicle_count: report.summary.vehicle_count,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", 'attachment; filename="mass-balance-report.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/v1/admin/waste-flow
 * Aggregated waste flow data for a Sankey-style visualization.
 * Uses today's active stops as the collection source and ward as the sink bucket.
 */
export async function getWasteFlowData(req: Request, res: Response, next: NextFunction) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const stops = await prisma.stop.findMany({
      where: {
        route: {
          is_active: true,
          date: { gte: today, lt: tomorrow },
        },
      },
      select: {
        status: true,
        route: {
          select: {
            ward: { select: { id: true, name: true } },
            vehicle: { select: { id: true, registration_no: true } },
          },
        },
        society: { select: { id: true, name: true } },
      },
    });

    const flows = stops
      .filter((stop) => stop.society)
      .map((stop) => ({
        source: stop.society!.name,
        vehicle: stop.route.vehicle.registration_no,
        ward: stop.route.ward.name,
        value: stop.status === "COMPLETED" ? 1 : 0.5,
      }));

    sendSuccess(res, {
      date: today.toISOString().split("T")[0],
      nodes: Array.from(
        new Set(
          flows.flatMap((flow) => [flow.source, flow.vehicle, flow.ward, "Dumping Yard"])
        )
      ).map((id) => ({ id })),
      links: [
        ...flows.map((flow) => ({
          source: flow.source,
          target: flow.vehicle,
          value: flow.value,
        })),
        ...flows.map((flow) => ({
          source: flow.vehicle,
          target: flow.ward,
          value: flow.value,
        })),
        ...flows.map((flow) => ({
          source: flow.ward,
          target: "Dumping Yard",
          value: flow.value,
        })),
      ],
    });
  } catch (err) {
    next(err);
  }
}
