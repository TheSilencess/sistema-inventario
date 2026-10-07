import { Router } from "express";
import { Prisma } from "@prisma/client";
import { db } from "../config/db";
import { env } from "../config";
import { route, ok } from "../utils/http";
import { movementInclude } from "./movements";
export const dashboardRouter = Router();
dashboardRouter.get(
  "/",
  route(async (_req, res) => {
    const tz = env.BUSINESS_TIMEZONE;
    const data = await db.$transaction(
      async (tx) => {
        const [summary] = await tx.$queryRaw<
          Array<{
            products: number;
            units: bigint;
            low: bigint;
            out: bigint;
            value: Prisma.Decimal;
          }>
        >`
   SELECT (SELECT COUNT(*)::int FROM "Product" WHERE status='ACTIVE') AS products,
   COALESCE(SUM(v.stock),0)::bigint AS units,
   COUNT(*) FILTER (WHERE v.stock>0 AND v.stock<=v."minimumStock") AS low,
   COUNT(*) FILTER (WHERE v.stock=0) AS out,
   COALESCE(SUM(v.stock*p."purchasePrice"),0) AS value
   FROM "ProductVariant" v JOIN "Product" p ON p.id=v."productId" WHERE v.status='ACTIVE' AND p.status='ACTIVE'`;
        const today = await tx.$queryRaw<
          Array<{ type: string; units: bigint }>
        >`SELECT type, SUM(ABS(quantity))::bigint AS units FROM "InventoryMovement" WHERE ("createdAt" AT TIME ZONE ${tz})::date=(NOW() AT TIME ZONE ${tz})::date GROUP BY type`;
        const chart = await tx.$queryRaw<
          Array<{ day: string; entry: bigint; exit: bigint }>
        >`SELECT to_char(d,'YYYY-MM-DD') AS day,COALESCE(SUM(m.quantity) FILTER(WHERE m.type='ENTRY'),0)::bigint AS entry, COALESCE(SUM(ABS(m.quantity)) FILTER(WHERE m.type='EXIT'),0)::bigint AS exit FROM generate_series((NOW() AT TIME ZONE ${tz})::date-6,(NOW() AT TIME ZONE ${tz})::date,'1 day') d LEFT JOIN "InventoryMovement" m ON (m."createdAt" AT TIME ZONE ${tz})::date=d::date GROUP BY d ORDER BY d`;
        const categories = await tx.$queryRaw<
          Array<{ name: string; units: bigint }>
        >`SELECT c.name,COALESCE(SUM(v.stock),0)::bigint AS units FROM "Category" c LEFT JOIN "Product" p ON p."categoryId"=c.id AND p.status='ACTIVE' LEFT JOIN "ProductVariant" v ON v."productId"=p.id AND v.status='ACTIVE' GROUP BY c.id,c.name ORDER BY c.name`;
        const recent = await tx.inventoryMovement.findMany({
          take: 8,
          orderBy: { createdAt: "desc" },
          include: movementInclude,
        });
        const lowStock = await tx.productVariant.findMany({
          where: {
            status: "ACTIVE",
            product: { status: "ACTIVE" },
            stock: { lte: tx.productVariant.fields.minimumStock },
          },
          include: { product: true },
          orderBy: { stock: "asc" },
          take: 6,
        });
        return {
          summary: {
            products: summary.products,
            units: Number(summary.units),
            low: Number(summary.low),
            out: Number(summary.out),
            value: summary.value.toString(),
            entriesToday: Number(
              today.find((t) => t.type === "ENTRY")?.units ?? 0,
            ),
            exitsToday: Number(
              today.find((t) => t.type === "EXIT")?.units ?? 0,
            ),
          },
          chart: chart.map((c) => ({
            ...c,
            entry: Number(c.entry),
            exit: Number(c.exit),
          })),
          categories: categories.map((c) => ({ ...c, units: Number(c.units) })),
          recent,
          lowStock,
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
    return ok(res, data);
  }),
);
