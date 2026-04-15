import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { AlertStatus } from "@prisma/client";
import { prisma } from "../utils/prisma";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { getSingleValue } from "../utils/request";
import { logAudit } from "../services/audit.service";

// ─── Validation Schemas ─────────────────────────────────────────────────────

export const resolveAlertSchema = z.object({
  notes: z.string().optional(),
});

// ─── Handlers ───────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/alerts
 * List all admin alerts.
 * Per PRD FR-ADM-22: all alerts logged with resolved/dismissed status.
 */
export async function listAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = getPagination(req);
    const status = getSingleValue(req.query.status) as AlertStatus | undefined;
    const alertType = getSingleValue(req.query.alert_type);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (alertType) where.alert_type = alertType;

    const [alerts, total] = await Promise.all([
      prisma.adminAlert.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          resolver: { select: { id: true, name: true } },
        },
      }),
      prisma.adminAlert.count({ where }),
    ]);

    sendSuccess(res, alerts, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/alerts/:id/resolve
 * Resolve an alert.
 */
export async function resolveAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const alertId = getSingleValue(req.params.id)!;

    const alert = await prisma.adminAlert.findUniqueOrThrow({ where: { id: alertId } });

    if (alert.status !== AlertStatus.OPEN) {
      sendError(res, `Alert is already ${alert.status.toLowerCase()}.`, 400, "INVALID_STATUS");
      return;
    }

    const updated = await prisma.adminAlert.update({
      where: { id: alertId },
      data: {
        status: AlertStatus.RESOLVED,
        resolved_by: req.user!.userId,
        resolved_at: new Date(),
      },
    });

    await logAudit({
      actorId: req.user!.userId,
      action: "RESOLVE_ALERT",
      entityType: "AdminAlert",
      entityId: alertId,
    });

    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/alerts/:id/dismiss
 * Dismiss an alert.
 */
export async function dismissAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const alertId = getSingleValue(req.params.id)!;

    const alert = await prisma.adminAlert.findUniqueOrThrow({ where: { id: alertId } });

    if (alert.status !== AlertStatus.OPEN) {
      sendError(res, `Alert is already ${alert.status.toLowerCase()}.`, 400, "INVALID_STATUS");
      return;
    }

    const updated = await prisma.adminAlert.update({
      where: { id: alertId },
      data: {
        status: AlertStatus.DISMISSED,
        resolved_by: req.user!.userId,
        resolved_at: new Date(),
      },
    });

    await logAudit({
      actorId: req.user!.userId,
      action: "DISMISS_ALERT",
      entityType: "AdminAlert",
      entityId: alertId,
    });

    sendSuccess(res, updated);
  } catch (err) {
    next(err);
  }
}
