import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { getSingleValue } from "../utils/request";
import { approveFine, rejectFine } from "../services/fine.service";
import { logAudit } from "../services/audit.service";

// ─── Validation Schemas ─────────────────────────────────────────────────────

export const rejectFineSchema = z.object({
  notes: z.string().min(1).max(1000),
});

// ─── Handlers ───────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/fine-events
 * List all fine events.
 * Per PRD FR-ADM-13.
 */
export async function listFineEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const { page, limit, skip } = getPagination(req);
    const status = getSingleValue(req.query.status);

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [fines, total] = await Promise.all([
      prisma.fineEvent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
        include: {
          society: { select: { name: true, wallet_balance: true } },
          stop: { select: { address: true } },
          admin: { select: { name: true } },
        },
      }),
      prisma.fineEvent.count({ where }),
    ]);

    sendSuccess(res, fines, 200, buildPaginationMeta(page, limit, total));
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/v1/admin/fine-events/:id/approve
 * Approve a fine event — deducts from society wallet.
 */
export async function approveFineHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const fineId = getSingleValue(req.params.id)!;
    await approveFine(fineId, req.user!.userId);

    await logAudit({
      actorId: req.user!.userId,
      action: "APPROVE_FINE",
      entityType: "FineEvent",
      entityId: fineId,
    });

    sendSuccess(res, { message: "Fine approved and wallet balance deducted." });
  } catch (err) {
    if (err instanceof Error && err.message.includes("already")) {
      sendError(res, err.message, 400, "INVALID_STATUS");
      return;
    }
    next(err);
  }
}

/**
 * POST /api/v1/admin/fine-events/:id/reject
 * Reject a fine event with notes.
 */
export async function rejectFineHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const fineId = getSingleValue(req.params.id)!;
    const { notes } = req.body;
    await rejectFine(fineId, req.user!.userId, notes);

    await logAudit({
      actorId: req.user!.userId,
      action: "REJECT_FINE",
      entityType: "FineEvent",
      entityId: fineId,
      newValue: { notes },
    });

    sendSuccess(res, { message: "Fine rejected." });
  } catch (err) {
    if (err instanceof Error && err.message.includes("already")) {
      sendError(res, err.message, 400, "INVALID_STATUS");
      return;
    }
    next(err);
  }
}
