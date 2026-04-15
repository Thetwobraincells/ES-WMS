import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { prisma } from "../utils/prisma";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { getPagination, buildPaginationMeta } from "../utils/pagination";
import { getSingleValue } from "../utils/request";
import { approveFine, rejectFine } from "../services/fine.service";
import { logAudit } from "../services/audit.service";
import { generateCsvBuffer, generatePdfBuffer } from "../services/export.service";

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
          stop: {
            select: {
              address: true,
              route: {
                select: {
                  driver: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
              photos: {
                select: {
                  id: true,
                  url: true,
                  taken_at: true,
                  geofence_valid: true,
                },
                orderBy: { taken_at: "desc" },
                take: 1,
              },
            },
          },
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
 * GET /api/v1/admin/fine-events/export?format=csv|pdf
 * Export the current month's fine collection report.
 */
export async function exportFineEvents(req: Request, res: Response, next: NextFunction) {
  try {
    const format = getSingleValue(req.query.format)?.toLowerCase();

    if (format !== "csv" && format !== "pdf") {
      sendError(res, "Query parameter 'format' must be 'csv' or 'pdf'.", 400, "INVALID_FORMAT");
      return;
    }

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthLabel = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const fines = await prisma.fineEvent.findMany({
      where: {
        created_at: {
          gte: monthStart,
          lt: monthEnd,
        },
      },
      orderBy: { created_at: "desc" },
      include: {
        society: { select: { name: true } },
      },
    });

    const reportRows = fines.map((fine) => ({
      fine_id: fine.id,
      society_name: fine.society.name,
      amount: fine.amount,
      status: fine.status,
      reason: fine.reason,
      created_at: fine.created_at.toISOString(),
    }));

    let buffer: Buffer;
    let contentType: string;
    let extension: "csv" | "pdf";

    if (format === "csv") {
      buffer = generateCsvBuffer(reportRows);
      contentType = "text/csv; charset=utf-8";
      extension = "csv";
    } else {
      buffer = await generatePdfBuffer(
        `Monthly Fine Collection Report (${monthLabel})`,
        ["Fine ID", "Society", "Amount", "Status", "Reason", "Created At"],
        reportRows.map((row) => [
          row.fine_id,
          row.society_name,
          row.amount,
          row.status,
          row.reason,
          row.created_at,
        ])
      );
      contentType = "application/pdf";
      extension = "pdf";
    }

    await logAudit({
      actorId: req.user!.userId,
      action: "EXPORT_FINES",
      entityType: "FineEvent",
      entityId: monthLabel,
      newValue: {
        format,
        count: fines.length,
      },
    });

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="fines-report.${extension}"`);
    res.send(buffer);
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
