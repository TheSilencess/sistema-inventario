import { Prisma } from "@prisma/client";
import { z } from "zod";
import type { ProfitSummary } from "./report-pdf";
export async function profitSummary(
  tx: Prisma.TransactionClient,
  query: unknown,
): Promise<ProfitSummary> {
  const f = z
    .object({
      from: z.string().datetime({ offset: true }).optional(),
      to: z.string().datetime({ offset: true }).optional(),
      categoryId: z.string().uuid().optional(),
      productId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      search: z.string().max(120).default(""),
    })
    .parse(query);
  const cond = [Prisma.sql`m.type='EXIT' AND m."isSale"=true`];
  if (f.from) cond.push(Prisma.sql`m."createdAt">=${new Date(f.from)}`);
  if (f.to) cond.push(Prisma.sql`m."createdAt"<=${new Date(f.to)}`);
  if (f.categoryId) cond.push(Prisma.sql`p."categoryId"=${f.categoryId}::uuid`);
  if (f.productId) cond.push(Prisma.sql`p.id=${f.productId}::uuid`);
  if (f.userId) cond.push(Prisma.sql`m."userId"=${f.userId}::uuid`);
  if (f.search)
    cond.push(
      Prisma.sql`(p.name ILIKE ${"%" + f.search + "%"} OR p.sku ILIKE ${"%" + f.search + "%"})`,
    );
  const [s] = await tx.$queryRaw<
    Array<{
      units: bigint;
      revenue: Prisma.Decimal;
      cost: Prisma.Decimal;
      profit: Prisma.Decimal;
      recordedProfit: Prisma.Decimal;
      estimatedProfit: Prisma.Decimal;
      estimatedUnits: bigint;
    }>
  >(Prisma.sql`SELECT COALESCE(SUM(ABS(m.quantity)),0)::bigint AS units,
 COALESCE(SUM(ABS(m.quantity)*COALESCE(m."unitSalePrice",p."salePrice")),0) AS revenue,
 COALESCE(SUM(ABS(m.quantity)*COALESCE(m."unitCost",p."purchasePrice")),0) AS cost,
 COALESCE(SUM(ABS(m.quantity)*(COALESCE(m."unitSalePrice",p."salePrice")-COALESCE(m."unitCost",p."purchasePrice"))),0) AS profit,
 COALESCE(SUM(ABS(m.quantity)*(m."unitSalePrice"-m."unitCost")) FILTER (WHERE m."unitCost" IS NOT NULL),0) AS "recordedProfit",
 COALESCE(SUM(ABS(m.quantity)*(p."salePrice"-p."purchasePrice")) FILTER (WHERE m."unitCost" IS NULL),0) AS "estimatedProfit",
 COALESCE(SUM(ABS(m.quantity)) FILTER (WHERE m."unitCost" IS NULL),0)::bigint AS "estimatedUnits"
 FROM "InventoryMovement" m JOIN "ProductVariant" v ON v.id=m."variantId" JOIN "Product" p ON p.id=v."productId" WHERE ${Prisma.join(cond, " AND ")}`);
  return {
    units: Number(s.units),
    revenue: s.revenue.toFixed(2),
    cost: s.cost.toFixed(2),
    profit: s.profit.toFixed(2),
    recordedProfit: s.recordedProfit.toFixed(2),
    estimatedProfit: s.estimatedProfit.toFixed(2),
    estimatedUnits: Number(s.estimatedUnits),
  };
}
