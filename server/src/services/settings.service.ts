import { prisma } from "../utils/prisma";

const CACHE_TTL_MS = 5 * 60 * 1000;

export const SETTING_KEYS = [
  "TRUCK_FULL_THRESHOLD_PERCENT",
  "DEFAULT_FINE_AMOUNT",
  "GEOFENCE_RADIUS_METERS",
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
};

export async function getSetting(key: SettingKey): Promise<number> {
  const now = Date.now();
  const cached = settingsCache.get(key);

  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const setting = await prisma.systemSetting.findUnique({
    where: { key },
  });

  const value = setting?.value ?? SETTING_DEFINITIONS[key].defaultValue;

  settingsCache.set(key, {
    value,
    expiresAt: now + CACHE_TTL_MS,
  });

  return value;
}

export async function updateSetting(key: SettingKey, value: number) {
  const updatedSetting = await prisma.systemSetting.upsert({
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

  settingsCache.delete(key);

  return updatedSetting;
}

export async function listSettings() {
  const storedSettings = await prisma.systemSetting.findMany({
    where: {
      key: { in: [...SETTING_KEYS] },
    },
    orderBy: { key: "asc" },
  });

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
