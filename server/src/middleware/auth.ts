import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { sendError } from "../utils/apiResponse";
import { UserRole } from "@prisma/client";

interface JwtPayload {
  userId: string;
  role: UserRole;
  iat: number;
  exp: number;
}

/**
 * JWT authentication middleware.
 * Extracts and verifies the Bearer token from the Authorization header.
 * On success, attaches `req.user = { userId, role }`.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    sendError(res, "Authentication required. Provide a Bearer token.", 401, "AUTH_REQUIRED");
    return;
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      sendError(res, "Token has expired. Please log in again.", 401, "TOKEN_EXPIRED");
      return;
    }
    sendError(res, "Invalid authentication token.", 401, "INVALID_TOKEN");
    return;
  }
}
