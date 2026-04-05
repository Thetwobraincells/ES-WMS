import { Response } from "express";

interface ApiResponsePayload<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: unknown;
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: ApiResponsePayload<T>["meta"]) {
  const payload: ApiResponsePayload<T> = { success: true, data };
  if (meta) payload.meta = meta;
  return res.status(statusCode).json(payload);
}

export function sendError(res: Response, error: string, statusCode = 400, code?: string, details?: unknown) {
  const payload: ApiResponsePayload<null> = { success: false, error };
  if (code) payload.code = code;
  if (details) payload.details = details;
  return res.status(statusCode).json(payload);
}

export function sendCreated<T>(res: Response, data: T) {
  return sendSuccess(res, data, 201);
}

export function sendNoContent(res: Response) {
  return res.status(204).send();
}
