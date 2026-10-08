import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "../config/db";
import { route, ok, pagination } from "../utils/http";
import { productWhere, variantFilters, matchingVariants } from "./products";
import { recordMovement } from "../services/inventory";
import { movement } from "../validators/inventory";
export const inventoryRouter = Router();
export const stockFilters = z.object({
  categoryId: z.string().uuid().optional(),
  stockStatus: z.enum(["LOW", "OUT", "AVAILABLE"]).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});
export function stockWhere(query: unknown): Prisma.ProductVariantWhereInput {
  const q = pagination(query);
  const f = stockFilters.parse(query);
  const vf = variantFilters.parse(query);
  return {
    ...matchingVariants(q.search, vf.size, vf.color, f.status),
    status: f.status,
    product: {
      ...productWhere(q.search),
      status: f.status,
      ...(f.categoryId ? { categoryId: f.categoryId } : {}),
    },
    ...(f.stockStatus === "OUT"
      ? { stock: 0 }
      : f.stockStatus === "LOW"
        ? { stock: { gt: 0, lte: db.productVariant.fields.minimumStock } }
        : f.stockStatus === "AVAILABLE"
          ? { stock: { gt: db.productVariant.fields.minimumStock } }
          : {}),
  };
}
export const stockInclude = { product: { include: { category: true } } };
inventoryRouter.get(
  "/",
  route(async (req, res) => {
    const q = pagination(req.query),
      where = stockWhere(req.query);
    const [items, total] = await db.$transaction([
      db.productVariant.findMany({
        where,
        include: stockInclude,
        skip: q.skip,
        take: q.limit,
        orderBy: { createdAt: q.sortOrder },
      }),
      db.productVariant.count({ where }),
    ]);
    return ok(res, { items, total, page: q.page, limit: q.limit });
  }),
);
inventoryRouter.post(
  "/movements",
  route(async (req, res) => {
    const input = movement.parse(req.body);
    const result = await recordMovement(input, req.actor.id);
    return ok(res, result, 201);
  }),
);
