import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "../config/db";
import { route, ok, pagination, AppError } from "../utils/http";
export const movementsRouter = Router();
export const movementInclude = {
  user: { select: { id: true, name: true } },
  variant: { include: { product: { include: { category: true } } } },
};
export function movementWhere(
  query: unknown,
): Prisma.InventoryMovementWhereInput {
  const q = z
    .object({
      type: z.enum(["ENTRY", "EXIT", "ADJUSTMENT"]).optional(),
      productId: z.string().uuid().optional(),
      categoryId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      from: z.string().datetime({ offset: true }).optional(),
      to: z.string().datetime({ offset: true }).optional(),
      search: z.string().max(120).optional(),
    })
    .parse(query);
  if (q.from && q.to && new Date(q.from) > new Date(q.to))
    throw new AppError(422, "Rango de fechas inválido.");
  return {
    type: q.type,
    userId: q.userId,
    ...(q.from || q.to
      ? {
          createdAt: {
            gte: q.from ? new Date(q.from) : undefined,
            lte: q.to ? new Date(q.to) : undefined,
          },
        }
      : {}),
    variant: {
      productId: q.productId,
      product: {
        categoryId: q.categoryId,
        ...(q.search
          ? {
              OR: [
                { name: { contains: q.search, mode: "insensitive" } },
                { sku: { contains: q.search, mode: "insensitive" } },
              ],
            }
          : {}),
      },
    },
  };
}
movementsRouter.get(
  "/",
  route(async (req, res) => {
    const q = pagination(req.query);
    const where = movementWhere(req.query);
    const [items, total] = await db.$transaction([
      db.inventoryMovement.findMany({
        where,
        include: movementInclude,
        skip: q.skip,
        take: q.limit,
        orderBy: { createdAt: q.sortOrder },
      }),
      db.inventoryMovement.count({ where }),
    ]);
    return ok(res, { items, total, page: q.page, limit: q.limit });
  }),
);
// Read-only directory for employee filters; account management remains ADMIN-only.
movementsRouter.get(
  "/actors",
  route(async (_req, res) =>
    ok(
      res,
      await db.user.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ),
  ),
);
