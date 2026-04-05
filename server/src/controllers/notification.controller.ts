import { Request, Response, NextFunction } from "express";
import { prisma } from "../utils/prisma";
import { sendSuccess } from "../utils/apiResponse";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { getSingleValue } from "../utils/request";

/**
 * GET /api/v1/notifications
 * Get notifications for the current user.
 * Per PRD FR-CIT-06: notification history for last 30 days.
 */
export async function getMyNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = getPagination(req);
    const userId = req.user!.userId;

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where: {
          target_user_id: userId,
          sent_at: { gte: thirtyDaysAgo },
        },
        skip,
        take: limit,
        orderBy: { sent_at: "desc" },
      }),
      prisma.notification.count({
        where: {
          target_user_id: userId,
          sent_at: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    sendSuccess(res, notifications, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a notification as read.
 */
export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const notificationId = getSingleValue(req.params.id)!;
    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: { read_at: new Date() },
    });

    sendSuccess(res, notification);
  } catch (err) {
    next(err);
  }
}
