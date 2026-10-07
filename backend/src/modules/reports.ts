import { Router } from "express";
import { z } from "zod";
import PDFDocument from "pdfkit";
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
          const where = movementWhere(filters),
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
          return {
            total,
            items: items.map((m) => ({
              Fecha: m.createdAt.toISOString(),
              Producto: m.variant.product.name,
              SKU: m.variant.sku,
              Variante:
                [m.variant.size, m.variant.color].filter(Boolean).join(" / ") ||
                "Única",
              Tipo: m.type,
              Cantidad: m.quantity,
              Anterior: m.previousStock,
              Posterior: m.resultingStock,
              Usuario: m.user.name,
              Motivo: m.reason,
              Observaciones: m.notes,
            })),
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
          items: items.map((v) => ({
            Producto: v.product.name,
            SKU: v.sku,
            Categoría: v.product.category.name,
            Talla: v.size,
            Color: v.color,
            Stock: v.stock,
            Mínimo: v.minimumStock,
            Costo: v.product.purchasePrice.toString(),
            Venta: v.product.salePrice.toString(),
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
          ].join("\r\n"),
      );
    }
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="reporte-${r.report}.pdf"`,
    );
    res.type("application/pdf");
    const doc = new PDFDocument({ margin: 42, size: "A4" });
    doc.pipe(res);
    doc.fontSize(20).text("Bodega · Reporte de " + r.report);
    doc
      .fontSize(9)
      .text(
        `Generado: ${new Date().toLocaleString("es-GT", { timeZone: "America/Guatemala" })} · Registros: ${data.total}`,
      )
      .moveDown();
    if (!data.items.length) doc.text("No hay registros para estos filtros.");
    for (const row of data.items) {
      const text = Object.entries(row)
        .map(([k, v]) => `${k}: ${v}`)
        .join("   |   ");
      const height = doc.heightOfString(text, { width: 510 }) + 14;
      if (doc.y + height > doc.page.height - 55) doc.addPage();
      doc.fontSize(9).text(text, { width: 510 }).moveDown(0.6);
    }
    doc.end();
    return undefined;
  }),
);
