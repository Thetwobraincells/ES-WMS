import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { sendSuccess } from "../utils/apiResponse";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { getSingleValue } from "../utils/request";
import { logAudit } from "../services/audit.service";

export const updateAlertSchema = z.object({
  status: z.enum(["RESOLVED", "DISMISSED"]),
});

/**
 * GET /api/v1/admin/alerts
 * Lists alerts from system notifications.
 */
export async function listAlerts(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = getPagination(req);
    const type = getSingleValue(req.query.type);
    const status = getSingleValue(req.query.status);

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (status === "ACTIVE") where.read_at = null;
    if (status === "RESOLVED") where.read_at = { not: null };

    const [alerts, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sent_at: "desc" },
        select: {
          id: true,
          type: true,
          body: true,
          read_at: true,
          sent_at: true,
        },
      }),
      prisma.notification.count({ where }),
    ]);

    const data = alerts.map((alert) => ({
      id: alert.id,
      type: alert.type,
      message: alert.body,
      status: alert.read_at ? "RESOLVED" : "ACTIVE",
      created_at: alert.sent_at,
    }));

    sendSuccess(res, data, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/alerts/:id
 * Marks an alert as resolved or dismissed.
 */
export async function updateAlert(req: Request, res: Response, next: NextFunction) {
  try {
    const alertId = getSingleValue(req.params.id)!;
    const { status } = req.body as z.infer<typeof updateAlertSchema>;

    await prisma.notification.update({
      where: { id: alertId },
      data: { read_at: new Date() },
    });

    await logAudit({
      actorId: req.user!.userId,
      action: status === "DISMISSED" ? "DISMISS_ALERT" : "RESOLVE_ALERT",
      entityType: "Notification",
      entityId: alertId,
      newValue: { status },
    });

    sendSuccess(res, { id: alertId, status });
  } catch (err) {
    next(err);
  }
}
