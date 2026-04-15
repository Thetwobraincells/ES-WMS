import { prisma } from "../utils/prisma";
import { Prisma } from "@prisma/client";

const CACHE_TTL_MS = 5 * 60 * 1000;

export const SETTING_KEYS = [
  "TRUCK_FULL_THRESHOLD_PERCENT",
  "DEFAULT_FINE_AMOUNT",
  "GEOFENCE_RADIUS_METERS",
  "INACCESSIBLE_ALERT_WEEKLY_LIMIT",
  "NON_SEGREGATION_CONSECUTIVE_DAYS",
  "MASS_BALANCE_VARIANCE_PERCENT",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];

type CacheEntry = {
  value: number;
  expiresAt: number;
};

type SettingDefinition = {
  defaultValue: number;
  description: string;
};

const settingsCache = new Map<SettingKey, CacheEntry>();

const SETTING_DEFINITIONS: Record<SettingKey, SettingDefinition> = {
  TRUCK_FULL_THRESHOLD_PERCENT: {
    defaultValue: 85,
    description: "Truck load percentage threshold used for truck-full validations and alerts.",
  },
  DEFAULT_FINE_AMOUNT: {
    defaultValue: 500,
    description: "Default fine amount applied for mixed waste violations.",
  },
  GEOFENCE_RADIUS_METERS: {
    defaultValue: 50,
    description: "Maximum allowed distance in meters for stop photo geofence validation.",
  },
  INACCESSIBLE_ALERT_WEEKLY_LIMIT: {
    defaultValue: 2,
    description: "Number of INACCESSIBLE skips per driver per week before admin alert is raised.",
  },
  NON_SEGREGATION_CONSECUTIVE_DAYS: {
    defaultValue: 3,
    description: "Number of consecutive non-segregation days for a society before admin alert is raised.",
  },
  MASS_BALANCE_VARIANCE_PERCENT: {
    defaultValue: 15,
    description: "Maximum allowed variance percentage between collected and dumped weight before alert.",
  },
};

export async function getSetting(key: SettingKey): Promise<number> {
  const now = Date.now();
  const cached = settingsCache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  let setting: { value: number } | null = null;

  try {
    setting = await prisma.systemSetting.findUnique({
      where: { key },
      select: { value: true },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      const fallbackValue = SETTING_DEFINITIONS[key].defaultValue;
      settingsCache.set(key, {
        value: fallbackValue,
        expiresAt: now + CACHE_TTL_MS,
      });
      return fallbackValue;
    }
    throw error;
  }

  const value = setting?.value ?? SETTING_DEFINITIONS[key].defaultValue;

  settingsCache.set(key, {
    value,
    expiresAt: now + CACHE_TTL_MS,
  });

  return value;
}

export async function updateSetting(key: SettingKey, value: number) {
  let updatedSetting;
  try {
    updatedSetting = await prisma.systemSetting.upsert({
      where: { key },
      update: {
        value,
        description: SETTING_DEFINITIONS[key].description,
      },
      create: {
        key,
        value,
        description: SETTING_DEFINITIONS[key].description,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      throw new Error(
        "System settings table is missing in the current database. Run Prisma migrations before updating settings."
      );
    }
    throw error;
  }

  settingsCache.delete(key);

  return updatedSetting;
}

export async function listSettings() {
  let storedSettings: Array<{
    key: string;
    value: number;
    description: string | null;
    updated_at: Date;
  }> = [];

  try {
    storedSettings = await prisma.systemSetting.findMany({
      where: {
        key: { in: [...SETTING_KEYS] },
      },
      orderBy: { key: "asc" },
    });
  } catch (error) {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2021"
    ) {
      throw error;
    }
  }

  const storedByKey = new Map(
    storedSettings.map((setting) => [setting.key as SettingKey, setting])
  );

  return SETTING_KEYS.map((key) => {
    const stored = storedByKey.get(key);

    return {
      key,
      value: stored?.value ?? SETTING_DEFINITIONS[key].defaultValue,
      description: stored?.description ?? SETTING_DEFINITIONS[key].description,
      updated_at: stored?.updated_at ?? null,
    };
  });
}
