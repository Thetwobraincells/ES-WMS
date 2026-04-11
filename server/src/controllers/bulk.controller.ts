import { NextFunction, Request, Response } from "express";
import { BinType, Prisma } from "@prisma/client";
import { parse } from "csv-parse/sync";
import { logAudit } from "../services/audit.service";
import { sendError, sendSuccess } from "../utils/apiResponse";
import { prisma } from "../utils/prisma";

const EXPECTED_HEADERS = [
  "route_id",
  "society_id",
  "address",
  "lat",
  "lng",
  "bin_type",
  "sequence_order",
] as const;

type CsvStopRow = Record<(typeof EXPECTED_HEADERS)[number], string>;

function parseBinType(value: string): BinType | null {
  const normalized = value.trim().toUpperCase();

  switch (normalized) {
    case BinType.WET:
      return BinType.WET;
    case BinType.DRY:
      return BinType.DRY;
    case BinType.MIXED:
      return BinType.MIXED;
    default:
      return null;
  }
}

function validateHeaders(headers: string[]): string[] {
  const normalizedHeaders = headers.map((header) => header.trim());
  const missingHeaders = EXPECTED_HEADERS.filter((header) => !normalizedHeaders.includes(header));
  const unexpectedHeaders = normalizedHeaders.filter((header) => !EXPECTED_HEADERS.includes(header as (typeof EXPECTED_HEADERS)[number]));

  return [
    ...missingHeaders.map((header) => `Missing required header: ${header}`),
    ...unexpectedHeaders.map((header) => `Unexpected header: ${header}`),
  ];
}

function mapRowsToStopData(rows: CsvStopRow[]): {
  data: Prisma.StopCreateManyInput[];
  errors: Array<{ row: number; message: string }>;
} {
  const errors: Array<{ row: number; message: string }> = [];

  const data = rows.flatMap((row, index) => {
    const rowNumber = index + 2;
    const routeId = row.route_id?.trim();
    const societyId = row.society_id?.trim();
    const address = row.address?.trim();
    const lat = Number(row.lat);
    const lng = Number(row.lng);
    const sequenceOrder = Number(row.sequence_order);
    const binType = parseBinType(row.bin_type ?? "");

    if (!routeId) {
      errors.push({ row: rowNumber, message: "route_id is required." });
    }

    if (!address) {
      errors.push({ row: rowNumber, message: "address is required." });
    }

    if (!Number.isFinite(lat)) {
      errors.push({ row: rowNumber, message: "lat must be a valid number." });
    }

    if (!Number.isFinite(lng)) {
      errors.push({ row: rowNumber, message: "lng must be a valid number." });
    }

    if (!Number.isInteger(sequenceOrder)) {
      errors.push({ row: rowNumber, message: "sequence_order must be an integer." });
    }

    if (!binType) {
      errors.push({ row: rowNumber, message: "bin_type must be WET, DRY, or MIXED." });
    }

    if (
      !routeId ||
      !address ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      !Number.isInteger(sequenceOrder) ||
      !binType
    ) {
      return [];
    }

    return [
      {
        route_id: routeId,
        society_id: societyId || null,
        address,
        lat,
        lng,
        bin_type: binType,
        sequence_order: sequenceOrder,
      } satisfies Prisma.StopCreateManyInput,
    ];
  });

  return { data, errors };
}

/**
 * POST /api/v1/admin/stops/bulk
 * Bulk upload stops from CSV for initial data seeding.
 */
export async function uploadStopsCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      sendError(res, "No CSV file uploaded.", 400, "NO_FILE");
      return;
    }

    let capturedHeaders: string[] = [];
    let rows: CsvStopRow[];

    try {
      rows = parse(req.file.buffer, {
        bom: true,
        columns: (headers: string[]) => {
          capturedHeaders = headers.map((header) => header.trim());
          return capturedHeaders;
        },
        skip_empty_lines: true,
        trim: true,
      }) as CsvStopRow[];
    } catch (error) {
      sendError(
        res,
        "Invalid CSV file.",
        400,
        "INVALID_CSV",
        error instanceof Error ? { message: error.message } : undefined
      );
      return;
    }

    const headerErrors = validateHeaders(capturedHeaders);
    if (headerErrors.length > 0) {
      sendError(
        res,
        "Validation failed.",
        422,
        "VALIDATION_ERROR",
        headerErrors.map((message) => ({ field: "headers", message }))
      );
      return;
    }

    const { data, errors } = mapRowsToStopData(rows);
    if (errors.length > 0) {
      sendError(
        res,
        "Validation failed.",
        422,
        "VALIDATION_ERROR",
        errors.map((error) => ({
          field: `row_${error.row}`,
          message: error.message,
        }))
      );
      return;
    }

    if (data.length === 0) {
      sendSuccess(res, { count: 0 });
      return;
    }

    const result = await prisma.stop.createMany({
      data,
    });

    await logAudit({
      actorId: req.user!.userId,
      action: "BULK_UPLOAD_STOPS",
      entityType: "Stop",
      entityId: "bulk-upload",
      newValue: {
        count: result.count,
        file_name: req.file.originalname,
      },
    });

    sendSuccess(res, { count: result.count });
  } catch (err) {
    next(err);
  }
}
