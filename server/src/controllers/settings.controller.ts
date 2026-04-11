import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { sendSuccess, sendError } from "../utils/apiResponse";
import {
  getSetting,
  listSettings,
  SETTING_KEYS,
  SettingKey,
  updateSetting,
} from "../services/settings.service";
import { logAudit } from "../services/audit.service";

export const updateSettingParamsSchema = z.object({
  key: z.enum(SETTING_KEYS),
});

export const updateSettingSchema = z.object({
  value: z.coerce.number().finite(),
});

const settingValueSchemas: Record<SettingKey, z.ZodType<number>> = {
  TRUCK_FULL_THRESHOLD_PERCENT: z.coerce.number().min(0).max(100),
  DEFAULT_FINE_AMOUNT: z.coerce.number().min(0),
  GEOFENCE_RADIUS_METERS: z.coerce.number().positive(),
};

/**
 * GET /api/v1/admin/settings
 * List all configurable system settings with effective values.
 */
export async function listSystemSettings(req: Request, res: Response, next: NextFunction) {
  try {
    const settings = await listSettings();
    sendSuccess(res, settings);
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/v1/admin/settings/:key
 * Update a supported system setting value.
 */
export async function updateSystemSetting(req: Request, res: Response, next: NextFunction) {
  try {
    const key = req.params.key as SettingKey;
    const parsedValue = settingValueSchemas[key].safeParse(req.body.value);

    if (!parsedValue.success) {
      sendError(
        res,
        "Validation failed.",
        422,
        "VALIDATION_ERROR",
        parsedValue.error.errors.map((error) => ({
          field: "value",
          message: error.message,
        }))
      );
      return;
    }

    const oldValue = await getSetting(key);
    const updatedSetting = await updateSetting(key, parsedValue.data);

    await logAudit({
      actorId: req.user!.userId,
      action: "UPDATE_SYSTEM_SETTING",
      entityType: "SystemSetting",
      entityId: key,
      oldValue: { key, value: oldValue },
      newValue: { key, value: updatedSetting.value },
    });

    sendSuccess(res, updatedSetting);
  } catch (err) {
    next(err);
  }
}
