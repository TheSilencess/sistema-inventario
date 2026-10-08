import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { rateLimit } from "express-rate-limit";
import { env } from "./config";
import { auth, admin } from "./middleware/auth";
import { errors, AppError, route, ok } from "./utils/http";
import { authRouter } from "./modules/auth";
import { usersRouter } from "./modules/users";
import { productsRouter } from "./modules/products";
import { categoriesRouter } from "./modules/categories";
import { inventoryRouter } from "./modules/inventory";
import { movementsRouter } from "./modules/movements";
import { dashboardRouter } from "./modules/dashboard";
import { reportsRouter } from "./modules/reports";
import { db } from "./config/db";
export const app = express();
app.disable("x-powered-by");
if (env.TRUST_PROXY) app.set("trust proxy", env.TRUST_PROXY);
app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());
app.use(
  "/api",
  rateLimit({
    windowMs: 60000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  }),
);
app.use("/api", (req, _res, next) => {
  if (["POST", "PATCH", "PUT", "DELETE"].includes(req.method)) {
    const origin = req.get("Origin");
    if (origin && origin !== new URL(env.FRONTEND_URL).origin)
      return next(new AppError(403, "Origen no autorizado."));
    if (
      req.path.startsWith("/auth/") &&
      ["/auth/refresh", "/auth/logout"].includes(req.path) &&
      !origin
    )
      return next(
        new AppError(
          403,
          "Incluya el encabezado Origin para operaciones de sesión.",
        ),
      );
  }
  next();
});
app.get(
  "/api/health",
  route(async (_req, res) => {
    await db.$queryRaw`SELECT 1`;
    return ok(res, { status: "ok" });
  }),
);
app.use("/api/auth", authRouter);
app.use("/api", auth);
// Employees may edit the catalogue, but cannot delete or deactivate records.
app.use("/api/products", (req, res, next) => {
  if (["GET", "POST", "PATCH"].includes(req.method) &&
      req.body?.status !== "INACTIVE" &&
      !(Array.isArray(req.body?.variants) && req.body.variants.some((v: { status?: string } | null) => v?.status === "INACTIVE"))) return next();
  return admin(req, res, next);
});
app.use("/api/categories", (req, res, next) => {
  if (req.method === "GET") return next();
  return admin(req, res, next);
});
app.use("/api/users", usersRouter);
app.use("/api/products", productsRouter);
app.use("/api/categories", categoriesRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/movements", admin, movementsRouter);
app.use("/api/dashboard", admin, dashboardRouter);
app.use("/api/reports", admin, reportsRouter);
app.use((_req, _res, next) => next(new AppError(404, "Ruta no encontrada.")));
app.use(errors);
