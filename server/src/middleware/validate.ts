import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";
import { sendError } from "../utils/apiResponse";

/**
 * Zod validation middleware factory.
 * Validates `req.body`, `req.query`, or `req.params` against a Zod schema.
 *
 * Usage:
 *   router.post("/", validate(myBodySchema, "body"), controller.create);
 *   router.get("/", validate(myQuerySchema, "query"), controller.list);
 */
export function validate(schema: ZodSchema, source: "body" | "query" | "params" = "body") {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const parsed = schema.parse(req[source]);
      // Replace the source with parsed + coerced values
      (req as unknown as Record<string, unknown>)[source] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const details = err.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        }));
        sendError(res, "Validation failed.", 422, "VALIDATION_ERROR", details);
        return;
      }
      next(err);
    }
  };
}
