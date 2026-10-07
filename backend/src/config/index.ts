import "dotenv/config";
import { z } from "zod";
export const env = z
  .object({
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(32),
    JWT_REFRESH_SECRET: z.string().min(32),
    PORT: z.coerce.number().int().positive().default(3000),
    FRONTEND_URL: z.string().url(),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),
    BUSINESS_TIMEZONE: z.string().default("America/Guatemala"),
  })
  .parse(process.env);
new Intl.DateTimeFormat("es-GT", { timeZone: env.BUSINESS_TIMEZONE });
if (env.COOKIE_SAME_SITE === "none" && env.NODE_ENV !== "production")
  throw new Error("SameSite none requiere producción HTTPS.");
