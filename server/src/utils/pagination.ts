import { Request } from "express";

export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function getPagination(req: Request, defaultLimit = 20): PaginationParams {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || defaultLimit));
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function buildPaginationMeta(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}
