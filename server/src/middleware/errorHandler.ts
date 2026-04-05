import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/apiResponse";

/**
 * Global error handler — catches all unhandled errors thrown in routes/middleware.
 * Returns a consistent JSON error response.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  console.error("🔥 Unhandled Error:", err);

  // Prisma known errors
  if (err.constructor.name === "PrismaClientKnownRequestError") {
    const prismaErr = err as unknown as { code: string; meta?: Record<string, unknown> };
    switch (prismaErr.code) {
      case "P2002":
        sendError(res, "A record with this value already exists.", 409, "DUPLICATE_ENTRY", prismaErr.meta);
        return;
      case "P2025":
        sendError(res, "Record not found.", 404, "NOT_FOUND");
        return;
      default:
        sendError(res, "Database error.", 500, "DB_ERROR");
        return;
    }
  }

  // Multer file errors
  if (err.constructor.name === "MulterError") {
    sendError(res, `File upload error: ${err.message}`, 400, "UPLOAD_ERROR");
    return;
  }

  // Generic fallback
  const statusCode = (err as unknown as { statusCode?: number }).statusCode || 500;
  const message = process.env.NODE_ENV === "production" ? "Internal server error." : err.message;

  sendError(res, message, statusCode, "INTERNAL_ERROR");
}
