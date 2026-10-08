import { Router } from "express";
import { z } from "zod";
import { renderReportPDF, ReportRow } from "../services/report-pdf";
import { profitSummary } from "../services/profits";
import { db } from "../config/db";
import { route, ok, pagination, AppError } from "../utils/http";
import { stockWhere, stockInclude } from "./inventory";
import { movementWhere, movementInclude } from "./movements";
export const reportsRouter = Router();
const reportQuery = z.object({
  report: z
    .enum([
      "inventory",
      "low",
      "out",
      "entry",
      "exit",
      "adjustment",
      "user",
      "product",
      "value",
      "profit",
    ])
    .default("inventory"),
  format: z.enum(["json", "csv", "pdf"]).default("json"),
});
const csv = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+@\-\t\r]/.test(s)) s = "'" + s;
  return '"' + s.replace(/"/g, '""') + '"';
};
reportsRouter.get(
  "/",
  route(async (req, res) => {
    const q = pagination(req.query),
      r = reportQuery.parse(req.query);
    const movement = [
      "entry",
      "exit",
      "adjustment",
      "user",
      "product",
      "profit",
    ].includes(r.report);
    const filters = {
      ...req.query,
      ...(r.report === "low"
        ? { stockStatus: "LOW" }
        : r.report === "out"
          ? { stockStatus: "OUT" }
          : {}),
      ...(["entry", "exit", "adjustment"].includes(r.report)
        ? {
            type:
              r.report === "entry"
                ? "ENTRY"
                : r.report === "exit"
                  ? "EXIT"
                  : "ADJUSTMENT",
          }
        : {}),
    };
    const limit = r.format === "json" ? q.limit : 10000,
      skip = r.format === "json" ? q.skip : 0;
    const data = await db.$transaction(
      async (tx) => {
        if (movement) {
          const where = {
              ...movementWhere(filters),
              ...(r.report === "profit"
                ? { type: "EXIT" as const, isSale: true }
                : {}),
            },
            total = await tx.inventoryMovement.count({ where });
          if (r.format !== "json" && total > 10000)
            throw new AppError(
              422,
              "La exportación supera 10,000 filas; reduzca el rango o los filtros.",
            );
          const items = await tx.inventoryMovement.findMany({
            where,
            include: movementInclude,
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
          });
          const summary =
            r.report === "profit"
              ? await profitSummary(tx, filters)
              : undefined;
          return {
            total,
            summary,
            items: items.map((m): ReportRow =>
              r.report === "profit"
                ? {
                    Fecha: m.createdAt.toISOString(),
                    Producto: m.variant.product.name,
                    SKU: m.variant.sku,
                    Variante:
                      [m.variant.size, m.variant.color]
                        .filter(Boolean)
                        .join(" / ") || "Única",
                    Unidades: Math.abs(m.quantity),
                    "Costo unitario": (
                      m.unitCost ?? m.variant.product.purchasePrice
                    ).toFixed(2),
                    "Venta unitaria": (
                      m.unitSalePrice ?? m.variant.product.salePrice
                    ).toFixed(2),
                    "Ganancia bruta": (
                      m.unitSalePrice ?? m.variant.product.salePrice
                    )
                      .sub(m.unitCost ?? m.variant.product.purchasePrice)
                      .mul(Math.abs(m.quantity))
                      .toFixed(2),
                    Usuario: m.user.name,
                    Precios: m.unitCost !== null ? "Guardados" : "Estimados",
                  }
                : {
                    Fecha: m.createdAt.toISOString(),
                    Producto: m.variant.product.name,
                    SKU: m.variant.sku,
                    Variante:
                      [m.variant.size, m.variant.color]
                        .filter(Boolean)
                        .join(" / ") || "Única",
                    Tipo: m.type,
                    Cantidad: m.quantity,
                    Anterior: m.previousStock,
                    Posterior: m.resultingStock,
                    Usuario: m.user.name,
                    Motivo: m.reason,
                    Observaciones: m.notes,
                  },
            ),
          };
        }
        const where = stockWhere(filters),
          total = await tx.productVariant.count({ where });
        if (r.format !== "json" && total > 10000)
          throw new AppError(
            422,
            "La exportación supera 10,000 filas; reduzca los filtros.",
          );
        const items = await tx.productVariant.findMany({
          where,
          include: stockInclude,
          skip,
          take: limit,
          orderBy: { sku: "asc" },
        });
        return {
          total,
          summary: undefined,
          items: items.map((v): ReportRow => ({
            Producto: v.product.name,
            SKU: v.sku,
            Categoría: v.product.category.name,
            Talla: v.size,
            Color: v.color,
            Stock: v.stock,
            Mínimo: v.minimumStock,
            Costo: v.product.purchasePrice.toString(),
            Venta: v.product.salePrice.toString(),
            "Margen unitario": v.product.salePrice
              .sub(v.product.purchasePrice)
              .toFixed(2),
            Valor: v.product.purchasePrice.mul(v.stock).toFixed(2),
          })),
        };
      },
      { isolationLevel: "RepeatableRead" },
    );
    if (r.format === "json")
      return ok(res, { ...data, page: q.page, limit: q.limit });
    const headers = data.items.length
      ? Object.keys(data.items[0])
      : ["Sin registros"];
    if (r.format === "csv") {
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="reporte-${r.report}.csv"`,
      );
      res.type("text/csv; charset=utf-8");
      return res.send(
        "﻿" +
          [
            headers.map(csv).join(","),
            ...data.items.map((row) =>
              headers
                .map((h) => csv((row as Record<string, unknown>)[h]))
                .join(","),
            ),
          ]
            .concat(
              data.summary
                ? [
                    "",
                    [
                      "RESUMEN TOTAL",
                      "Unidades",
                      "Ingresos",
                      "Costos",
                      "Ganancia bruta",
                      "Ganancia registrada",
                      "Ganancia estimada",
                    ]
                      .map(csv)
                      .join(","),
                    [
                      "Todos los registros filtrados",
                      data.summary.units,
                      data.summary.revenue,
                      data.summary.cost,
                      data.summary.profit,
                      data.summary.recordedProfit,
                      data.summary.estimatedProfit,
                    ]
                      .map(csv)
                      .join(","),
                  ]
                : [],
            )
            .join("\r\n"),
      );
    }
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reporte-${r.report}.pdf"`,
    );
    res.type("application/pdf");
    const from =
      typeof req.query.from === "string"
        ? new Date(req.query.from).toLocaleDateString("es-GT", {
            timeZone: "America/Guatemala",
          })
        : "Sin fecha inicial";
    const to =
      typeof req.query.to === "string"
        ? new Date(req.query.to).toLocaleDateString("es-GT", {
            timeZone: "America/Guatemala",
          })
        : "Sin fecha final";
    const category =
      typeof req.query.categoryId === "string"
        ? await db.category.findUnique({
            where: { id: req.query.categoryId },
            select: { name: true },
          })
        : null;
    const actor =
      typeof req.query.userId === "string"
        ? await db.user.findUnique({
            where: { id: req.query.userId },
            select: { name: true },
          })
        : null;
    renderReportPDF(res, r.report, data.items, {
      total: data.total,
      author: req.actor.name,
      summary: data.summary,
      filters: `Periodo: ${movement ? from + " al " + to : "Existencias actuales"} | Categoría: ${category?.name || "Todas"} | Usuario: ${actor?.name || "Todos"} | Búsqueda: ${q.search || "Sin filtro"}`,
    });
    return undefined;
  }),
);
