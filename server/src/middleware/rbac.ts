import { Request, Response, NextFunction } from "express";
import { UserRole } from "@prisma/client";
import { sendError } from "../utils/apiResponse";

/**
 * Role-based access control middleware.
 * Usage: `requireRole(UserRole.ADMIN, UserRole.SUPERVISOR)`
 * Must be placed AFTER the `authenticate` middleware.
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      sendError(res, "Authentication required.", 401, "AUTH_REQUIRED");
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      sendError(
        res,
        `Access denied. Required role(s): ${allowedRoles.join(", ")}`,
        403,
        "FORBIDDEN"
      );
      return;
    }

    next();
  };
}
