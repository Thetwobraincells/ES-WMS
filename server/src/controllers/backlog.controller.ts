import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { getSingleValue } from "../utils/request";
import { reassignBacklog } from "../services/backlog.service";
import { logAudit } from "../services/audit.service";

// ─── Validation Schemas ─────────────────────────────────────────────────────

export const reassignBacklogSchema = z.object({
  new_route_id: z.string().uuid(),
});

// ─── Handlers ───────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/backlog
 * Get all pending backlog entries.
 * Per PRD FR-ADM-07.
 */
export async function listBacklogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = getPagination(req);
    const status = getSingleValue(req.query.status);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [backlogs, total] = await Promise.all([
      prisma.backlogEntry.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          original_stop: {
            include: {
              society: { select: { name: true, address: true } },
              route: {
                select: {
                  ward: { select: { name: true } },
                  driver: { select: { name: true } },
                },
              },
            },
          },
          new_route: {
            select: {
              id: true,
              shift: true,
              driver: { select: { name: true } },
              vehicle: { select: { registration_no: true } },
            },
          },
        },
      }),
      prisma.backlogEntry.count({ where }),
    ]);

    sendSuccess(res, backlogs, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/backlog/:id/reassign
 * Reassign a backlog entry to a new route.
 * Per PRD FR-ADM-04/07.
 */
export async function reassignBacklogHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const backlogId = getSingleValue(req.params.id)!;
    const { new_route_id } = req.body;

    // Verify route exists
    await prisma.route.findUniqueOrThrow({ where: { id: new_route_id } });

    await reassignBacklog(backlogId, new_route_id);

    await logAudit({
      actorId: req.user!.userId,
      action: "REASSIGN_BACKLOG",
      entityType: "BacklogEntry",
      entityId: backlogId,
      newValue: { new_route_id },
    });

    sendSuccess(res, { message: "Backlog reassigned successfully." });
  } catch (err) {
    next(err);
  }
}
