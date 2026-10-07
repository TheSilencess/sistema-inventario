import { Router, Response } from "express";
import { randomUUID, createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { z } from "zod";
import { rateLimit } from "express-rate-limit";
import { db, transaction } from "../config/db";
import { env } from "../config";
import { AppError, route, ok, userSelect, audit } from "../utils/http";
import { auth } from "../middleware/auth";
import { User } from "@prisma/client";
export const authRouter = Router();
const cookie = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: env.COOKIE_SAME_SITE,
  path: "/api/auth",
} as const;
const hash = (s: string) => createHash("sha256").update(s).digest("hex");
function pair(user: User, familyId: string) {
  const refresh = jwt.sign({ familyId }, env.JWT_REFRESH_SECRET, {
    algorithm: "HS256",
    subject: user.id,
    jwtid: randomUUID(),
    issuer: "bodega-api",
    audience: "bodega-refresh",
    expiresIn: "7d",
  });
  const accessToken = jwt.sign(
    { ver: user.tokenVersion, sid: familyId },
    env.JWT_SECRET,
    {
      algorithm: "HS256",
      subject: user.id,
      issuer: "bodega-api",
      audience: "bodega-web",
      expiresIn: "15m",
    },
  );
  return { refresh, accessToken };
}
function respond(
  res: Response,
  refresh: string,
  accessToken: string,
  user: unknown,
) {
  res.cookie("bodega_refresh", refresh, { ...cookie, maxAge: 7 * 86400000 });
  return ok(res, { accessToken, user });
}
authRouter.post(
  "/login",
  rateLimit({
    windowMs: 15 * 60000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: { error: { message: "Demasiados intentos. Espere 15 minutos." } },
  }),
  route(async (req, res) => {
    const input = z
      .object({
        email: z
          .string()
          .email()
          .transform((v) => v.toLowerCase()),
        password: z.string().min(1).max(72),
      })
      .strict()
      .parse(req.body);
    const user = await db.user.findUnique({ where: { email: input.email } });
    if (
      !user ||
      !(await bcrypt.compare(input.password, user.passwordHash)) ||
      !user.active
    )
      throw new AppError(401, "Correo o contraseña incorrectos.");
    const familyId = randomUUID();
    const tokens = pair(user, familyId);
    await db.refreshToken.create({
      data: {
        userId: user.id,
        familyId,
        tokenHash: hash(tokens.refresh),
        expiresAt: new Date(Date.now() + 7 * 86400000),
      },
    });
    const safe = await db.user.findUnique({
      where: { id: user.id },
      select: userSelect,
    });
    return respond(res, tokens.refresh, tokens.accessToken, safe);
  }),
);
authRouter.post(
  "/refresh",
  route(async (req, res) => {
    const raw: unknown = req.cookies?.bodega_refresh;
    if (typeof raw !== "string") throw new AppError(401, "Inicie sesión.");
    let payload;
    try {
      payload = jwt.verify(raw, env.JWT_REFRESH_SECRET, {
        algorithms: ["HS256"],
        issuer: "bodega-api",
        audience: "bodega-refresh",
      });
    } catch {
      throw new AppError(401, "Sesión vencida.");
    }
    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.familyId !== "string"
    )
      throw new AppError(401, "Sesión inválida.");
    const record = await db.refreshToken.findUnique({
      where: { tokenHash: hash(raw) },
      include: { user: true },
    });
    if (
      !record ||
      record.userId !== payload.sub ||
      record.familyId !== payload.familyId
    )
      throw new AppError(401, "Sesión inválida.");
    if (record.revokedAt) {
      await db.refreshToken.updateMany({
        where: {
          familyId: record.familyId,
          userId: record.userId,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      throw new AppError(
        401,
        "La sesión fue reutilizada. Inicie sesión otra vez.",
      );
    }
    if (record.expiresAt <= new Date() || !record.user.active)
      throw new AppError(401, "Sesión vencida.");
    const tokens = pair(record.user, record.familyId);
    await transaction(async (tx) => {
      const changed = await tx.refreshToken.updateMany({
        where: { id: record.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      if (changed.count !== 1) throw new AppError(401, "Sesión ya renovada.");
      await tx.refreshToken.create({
        data: {
          userId: record.userId,
          familyId: record.familyId,
          tokenHash: hash(tokens.refresh),
          expiresAt: new Date(Date.now() + 7 * 86400000),
        },
      });
    });
    return respond(
      res,
      tokens.refresh,
      tokens.accessToken,
      await db.user.findUnique({
        where: { id: record.userId },
        select: userSelect,
      }),
    );
  }),
);
authRouter.post(
  "/logout",
  route(async (req, res) => {
    const raw: unknown = req.cookies?.bodega_refresh;
    if (typeof raw === "string") {
      const rec = await db.refreshToken.findUnique({
        where: { tokenHash: hash(raw) },
      });
      if (rec)
        await db.refreshToken.updateMany({
          where: {
            familyId: rec.familyId,
            userId: rec.userId,
            revokedAt: null,
          },
          data: { revokedAt: new Date() },
        });
    }
    res.clearCookie("bodega_refresh", cookie);
    return ok(res, { message: "Sesión cerrada." });
  }),
);
authRouter.get(
  "/me",
  auth,
  route(async (req, res) =>
    ok(
      res,
      await db.user.findUnique({
        where: { id: req.actor.id },
        select: userSelect,
      }),
    ),
  ),
);
export const passwordSchema = z
  .string()
  .min(12)
  .max(72)
  .regex(/[A-Z]/, "Incluya una mayúscula.")
  .regex(/[a-z]/, "Incluya una minúscula.")
  .regex(/[0-9]/, "Incluya un número.")
  .regex(/[^A-Za-z0-9]/, "Incluya un símbolo.");
authRouter.post(
  "/password",
  auth,
  route(async (req, res) => {
    const input = z
      .object({
        currentPassword: z.string().min(1).max(72),
        password: passwordSchema,
      })
      .strict()
      .parse(req.body);
    const user = await db.user.findUniqueOrThrow({
      where: { id: req.actor.id },
    });
    if (!(await bcrypt.compare(input.currentPassword, user.passwordHash)))
      throw new AppError(400, "La contraseña actual es incorrecta.");
    const passwordHash = await bcrypt.hash(input.password, 12);
    await transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash, tokenVersion: { increment: 1 } },
      });
      await tx.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await audit(tx, user.id, "PASSWORD_CHANGED", "User", user.id);
    });
    res.clearCookie("bodega_refresh", cookie);
    return ok(res, {
      message: "Contraseña actualizada. Inicie sesión otra vez.",
    });
  }),
);
