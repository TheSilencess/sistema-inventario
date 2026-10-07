import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcrypt";
import { Prisma } from "@prisma/client";
import { db, transaction } from "../config/db";
import { admin } from "../middleware/auth";
import {
  AppError,
  route,
  ok,
  pagination,
  id,
  userSelect,
  audit,
} from "../utils/http";
import { passwordSchema } from "./auth";
export const usersRouter = Router();
usersRouter.use(admin);
const base = z
  .object({
    name: z.string().trim().min(2).max(100),
    email: z
      .string()
      .email()
      .transform((v) => v.toLowerCase()),
    role: z.enum(["ADMIN", "EMPLOYEE"]),
    active: z.boolean().default(true),
  })
  .strict();
usersRouter.get(
  "/",
  route(async (req, res) => {
    const q = pagination(req.query);
    const where: Prisma.UserWhereInput = q.search
      ? {
          OR: [
            { name: { contains: q.search, mode: "insensitive" } },
            { email: { contains: q.search, mode: "insensitive" } },
          ],
        }
      : {};
    const [items, total] = await db.$transaction([
      db.user.findMany({
        where,
        select: userSelect,
        skip: q.skip,
        take: q.limit,
        orderBy: { createdAt: q.sortOrder },
      }),
      db.user.count({ where }),
    ]);
    return ok(res, { items, total, page: q.page, limit: q.limit });
  }),
);
usersRouter.post(
  "/",
  route(async (req, res) => {
    const { password, ...data } = base
      .extend({ password: passwordSchema })
      .parse(req.body);
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await transaction(async (tx) => {
      const user = await tx.user.create({
        data: { ...data, passwordHash },
        select: userSelect,
      });
      await audit(tx, req.actor.id, "USER_CREATED", "User", user.id, {
        role: user.role,
      });
      return user;
    });
    return ok(res, user, 201);
  }),
);
usersRouter.patch(
  "/:id",
  route(async (req, res) => {
    const userId = id(req.params.id);
    const data = base
      .partial()
      .extend({ password: passwordSchema.optional() })
      .parse(req.body);
    const { password, ...changes } = data;
    const passwordHash = password ? await bcrypt.hash(password, 12) : undefined;
    const user = await transaction(async (tx) => {
      const old = await tx.user.findUnique({ where: { id: userId } });
      if (!old) throw new AppError(404, "Usuario no encontrado.");
      if (
        userId === req.actor.id &&
        (changes.active === false || changes.role === "EMPLOYEE")
      )
        throw new AppError(
          409,
          "No puede desactivar ni quitar su propio rol administrador.",
        );
      if (
        old.active &&
        old.role === "ADMIN" &&
        (changes.active === false || changes.role === "EMPLOYEE") &&
        (await tx.user.count({ where: { active: true, role: "ADMIN" } })) <= 1
      )
        throw new AppError(409, "Debe quedar un administrador activo.");
      const invalidate =
        passwordHash !== undefined ||
        changes.active !== undefined ||
        changes.role !== undefined;
      const user = await tx.user.update({
        where: { id: userId },
        data: {
          ...changes,
          passwordHash,
          ...(invalidate ? { tokenVersion: { increment: 1 } } : {}),
        },
        select: userSelect,
      });
      if (invalidate)
        await tx.refreshToken.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      await audit(tx, req.actor.id, "USER_UPDATED", "User", userId, {
        before: { role: old.role, active: old.active },
        after: { role: user.role, active: user.active },
        passwordChanged: !!passwordHash,
      });
      return user;
    });
    return ok(res, user);
  }),
);
