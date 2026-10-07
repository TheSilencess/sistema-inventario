import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db, transaction } from "../config/db";
import { AppError, route, ok, id, pagination, audit } from "../utils/http";
export const productsRouter = Router();
const money = z
  .union([z.string(), z.number()])
  .transform(String)
  .refine(
    (v) => /^\d{1,10}(\.\d{1,2})?$/.test(v),
    "Precio inválido: máximo dos decimales.",
  );
const variant = z
  .object({
    sku: z.string().trim().min(1).max(80),
    barcode: z.string().trim().max(100).nullable().optional(),
    size: z.string().trim().max(30).default(""),
    color: z.string().trim().max(50).default(""),
    minimumStock: z.number().int().min(0).max(1000000).default(5),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  })
  .strict();
const product = z
  .object({
    sku: z.string().trim().min(1).max(80),
    barcode: z.string().trim().max(100).nullable().optional(),
    name: z.string().trim().min(2).max(150),
    description: z.string().max(2000).default(""),
    brand: z.string().trim().max(100).default(""),
    categoryId: z.string().uuid(),
    purchasePrice: money,
    salePrice: money,
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  })
  .strict();
export function productWhere(search: string): Prisma.ProductWhereInput {
  return search
    ? {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { sku: { contains: search, mode: "insensitive" } },
          { barcode: { contains: search, mode: "insensitive" } },
          { brand: { contains: search, mode: "insensitive" } },
          {
            variants: {
              some: {
                OR: [
                  { sku: { contains: search, mode: "insensitive" } },
                  { barcode: { contains: search, mode: "insensitive" } },
                ],
              },
            },
          },
        ],
      }
    : {};
}
const include = {
  category: true,
  variants: { orderBy: { createdAt: "asc" as const } },
};
productsRouter.get(
  "/",
  route(async (req, res) => {
    const q = pagination(req.query);
    const filters = z
      .object({
        categoryId: z.string().uuid().optional(),
        status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
      })
      .parse(req.query);
    const where = { ...productWhere(q.search), ...filters };
    const [items, total] = await db.$transaction([
      db.product.findMany({
        where,
        include,
        skip: q.skip,
        take: q.limit,
        orderBy: { [q.sortBy]: q.sortOrder },
      }),
      db.product.count({ where }),
    ]);
    return ok(res, { items, total, page: q.page, limit: q.limit });
  }),
);
productsRouter.get(
  "/:id",
  route(async (req, res) =>
    ok(
      res,
      await db.product.findUniqueOrThrow({
        where: { id: id(req.params.id) },
        include,
      }),
    ),
  ),
);
productsRouter.post(
  "/",
  route(async (req, res) => {
    const { variants, hasVariants, ...data } = product
      .extend({
        hasVariants: z.boolean().default(false),
        variants: z.array(variant).min(1).max(100),
      })
      .parse(req.body);
    if (
      !hasVariants &&
      (variants.length !== 1 || variants[0].size || variants[0].color)
    )
      throw new AppError(
        422,
        "Un producto simple debe tener una única variante sin talla ni color.",
      );
    if (hasVariants && variants.some((v) => !v.size && !v.color))
      throw new AppError(422, "Indique talla o color en cada variante.");
    const row = await transaction(async (tx) => {
      const cat = await tx.category.findUnique({
        where: { id: data.categoryId },
      });
      if (cat?.status !== "ACTIVE")
        throw new AppError(422, "Seleccione una categoría activa.");
      const row = await tx.product.create({
        data: {
          ...data,
          barcode: data.barcode || null,
          hasVariants,
          variants: {
            create: variants.map((v) => ({ ...v, barcode: v.barcode || null })),
          },
        },
        include,
      });
      await audit(tx, req.actor.id, "PRODUCT_CREATED", "Product", row.id, {
        sku: row.sku,
      });
      return row;
    });
    return ok(res, row, 201);
  }),
);
productsRouter.patch(
  "/:id",
  route(async (req, res) => {
    const productId = id(req.params.id);
    const data = product.partial().parse(req.body);
    return ok(
      res,
      await transaction(async (tx) => {
        const old = await tx.product.findUniqueOrThrow({
          where: { id: productId },
        });
        if (
          data.categoryId &&
          data.categoryId !== old.categoryId &&
          !(await tx.category.findFirst({
            where: { id: data.categoryId, status: "ACTIVE" },
          }))
        )
          throw new AppError(422, "Categoría inactiva o inexistente.");
        const row = await tx.product.update({
          where: { id: productId },
          data: {
            ...data,
            ...(data.barcode !== undefined
              ? { barcode: data.barcode || null }
              : {}),
          },
          include,
        });
        await audit(tx, req.actor.id, "PRODUCT_UPDATED", "Product", row.id, {
          changes: JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue,
        });
        return row;
      }),
    );
  }),
);
productsRouter.post(
  "/:id/variants",
  route(async (req, res) => {
    const productId = id(req.params.id);
    const data = variant.parse(req.body);
    return ok(
      res,
      await transaction(async (tx) => {
        const p = await tx.product.findUniqueOrThrow({
          where: { id: productId },
        });
        if (!p.hasVariants)
          throw new AppError(
            409,
            "Este producto es simple. Cree un producto con variantes.",
          );
        if (!data.size && !data.color)
          throw new AppError(422, "Indique talla o color.");
        const row = await tx.productVariant.create({
          data: { ...data, barcode: data.barcode || null, productId },
        });
        await audit(
          tx,
          req.actor.id,
          "VARIANT_CREATED",
          "ProductVariant",
          row.id,
          { sku: row.sku },
        );
        return row;
      }),
      201,
    );
  }),
);
productsRouter.patch(
  "/:id/variants/:variantId",
  route(async (req, res) => {
    const productId = id(req.params.id),
      variantId = id(req.params.variantId);
    const data = variant.partial().parse(req.body);
    return ok(
      res,
      await transaction(async (tx) => {
        const old = await tx.productVariant.findFirst({
          where: { id: variantId, productId },
          include: { product: true },
        });
        if (!old) throw new AppError(404, "Variante no encontrada.");
        const size = data.size ?? old.size,
          color = data.color ?? old.color;
        if (old.product.hasVariants ? !size && !color : !!size || !!color)
          throw new AppError(
            422,
            "Talla/color incompatibles con el tipo de producto.",
          );
        const row = await tx.productVariant.update({
          where: { id: variantId },
          data: {
            ...data,
            ...(data.barcode !== undefined
              ? { barcode: data.barcode || null }
              : {}),
          },
        });
        await audit(
          tx,
          req.actor.id,
          "VARIANT_UPDATED",
          "ProductVariant",
          row.id,
          JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue,
        );
        return row;
      }),
    );
  }),
);
