import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),

  JWT_SECRET: z.string().min(16),
  JWT_EXPIRY_MOBILE: z.string().default("24h"),
  JWT_EXPIRY_WEB: z.string().default("8h"),

  IOT_API_KEY: z.string().default("iot-engine-secret-key-change-in-production"),

  UPLOAD_DIR: z.string().default("./uploads"),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),

  GEOFENCE_RADIUS_METERS: z.coerce.number().default(50),

  DEFAULT_FINE_AMOUNT: z.coerce.number().default(500),
  TRUCK_FULL_THRESHOLD_PERCENT: z.coerce.number().default(85),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Invalid environment variables:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
