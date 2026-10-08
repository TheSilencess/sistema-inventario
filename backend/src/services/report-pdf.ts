import PDFDocument from "pdfkit";
import type { Response } from "express";
export type ReportRow = Record<string, string | number>;
export type ProfitSummary = {
  units: number;
  revenue: string;
  cost: string;
  profit: string;
  recordedProfit: string;
  estimatedProfit: string;
  estimatedUnits: number;
};
export const reportNames: Record<string, string> = {
  inventory: "Inventario actual",
  low: "Stock bajo",
  out: "Productos agotados",
  entry: "Entradas de mercancía",
  exit: "Salidas de mercancía",
  adjustment: "Ajustes de inventario",
  user: "Movimientos por usuario",
  product: "Movimientos por producto",
  value: "Valor del inventario",
  profit: "Ganancias por ventas",
};
const currency = (v: string | number) =>
  "Q " +
  Number(v).toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export function renderReportPDF(
  res: Response,
  report: string,
  rows: ReportRow[],
  meta: {
    total: number;
    author: string;
    filters: string;
    summary?: ProfitSummary;
  },
) {
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 34,
    bufferPages: true,
    info: {
      Title: reportNames[report],
      Author: "Bodega",
      Subject: "Reporte de inventario y control",
    },
  });
  doc.pipe(res);
  const W = doc.page.width,
    H = doc.page.height,
    L = 34,
    R = W - 34,
    width = R - L;
  let y = 0;
  let first = true;
  const green = "#245D4E",
    ink = "#263C34",
    muted = "#708279",
    line = "#E2EAE5",
    pale = "#F0F6F2";
  type Col = {
    label: string;
    key: string;
    width: number;
    money?: boolean;
    right?: boolean;
  };
  let cols: Col[];
  if (report === "profit")
    cols = [
      { label: "Fecha", key: "Fecha", width: 82 },
      { label: "Producto / SKU", key: "Producto", width: 180 },
      { label: "Variante", key: "Variante", width: 87 },
      { label: "Unidades", key: "Unidades", width: 50, right: true },
      { label: "Costo ud.", key: "Costo unitario", width: 70, money: true },
      { label: "Venta ud.", key: "Venta unitaria", width: 70, money: true },
      { label: "Ganancia", key: "Ganancia bruta", width: 83, money: true },
      { label: "Responsable", key: "Usuario", width: 100 },
      { label: "Precios", key: "Precios", width: 73 },
    ];
  else if (["entry", "exit", "adjustment", "user", "product"].includes(report))
    cols = [
      { label: "Fecha", key: "Fecha", width: 84 },
      { label: "Producto / SKU", key: "Producto", width: 170 },
      { label: "Variante", key: "Variante", width: 90 },
      { label: "Movimiento", key: "Tipo", width: 70 },
      { label: "Cantidad", key: "Cantidad", width: 50, right: true },
      { label: "Antes / Después", key: "Stock", width: 75, right: true },
      { label: "Responsable", key: "Usuario", width: 95 },
      { label: "Motivo / Observaciones", key: "Motivo", width: 180 },
    ];
  else
    cols = [
      { label: "Producto / SKU", key: "Producto", width: 175 },
      { label: "Categoría", key: "Categoría", width: 95 },
      { label: "Talla / Color", key: "Variante", width: 110 },
      { label: "Stock", key: "Stock", width: 50, right: true },
      { label: "Mínimo", key: "Mínimo", width: 50, right: true },
      { label: "Costo ud.", key: "Costo", width: 75, money: true },
      { label: "Venta ud.", key: "Venta", width: 75, money: true },
      { label: "Margen ud.", key: "Margen unitario", width: 75, money: true },
      { label: "Valor stock", key: "Valor", width: 85, money: true },
    ];
  const sum = cols.reduce((n, c) => n + c.width, 0);
  cols = cols.map((c) => ({ ...c, width: (c.width / sum) * width }));
  const text = (
    s: string,
    x: number,
    at: number,
    w: number,
    size = 9,
    color = ink,
    bold = false,
    align: "left" | "right" = "left",
  ) => {
    doc.save();
    doc
      .font(bold ? "Helvetica-Bold" : "Helvetica")
      .fontSize(size)
      .fillColor(color)
      .text(s, align === "right" ? x + w - doc.widthOfString(s) : x, at, { lineBreak: false });
    doc.restore();
  };
  function header() {
    doc.save();
    doc.rect(0, 0, W, 7).fill(green);
    text("BODEGA", L, 24, 160, 18, green, true);
    text("INVENTARIO & CONTROL", L + 105, 29, 180, 8, muted);
    text("REPORTE OPERATIVO", R - 190, 29, 190, 8, muted, false, "right");
    text(reportNames[report], L, 62, width, 22, ink, true);
    text(
      `${meta.total.toLocaleString("es-GT")} registros · Generado: ${new Date().toLocaleString("es-GT", { timeZone: "America/Guatemala" })} · Por: ${meta.author}`,
      L,
      94,
      width,
      8,
      muted,
    );
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor(muted)
      .text(meta.filters, L, 112, { width, height: 32, ellipsis: true });
    y = 150;
    if (first && meta.summary) {
      const summary = meta.summary;
      const cards = [
        [
          "Ingresos por ventas",
          currency(summary.revenue),
          "Precio de venta × unidades",
        ],
        [
          "Costo de mercancía vendida",
          currency(summary.cost),
          "Costo del producto × unidades",
        ],
        [
          "Ganancia bruta calculada",
          currency(summary.profit),
          "Incluye estimaciones indicadas abajo",
        ],
      ];
      const gap = 12,
        cw = (width - gap * 2) / 3;
      cards.forEach(([label, value, note], i) => {
        const x = L + i * (cw + gap);
        doc.roundedRect(x, y, cw, 65, 7).fill(pale);
        text(label, x + 12, y + 10, cw - 24, 8, muted);
        text(value, x + 12, y + 26, cw - 24, 18, green, true);
        text(note, x + 12, y + 50, cw - 24, 7, muted);
      });
      y += 78;
      text(
        `Unidades vendidas: ${summary.units} | Ganancia con precios guardados: ${currency(summary.recordedProfit)} | Estimada: ${currency(summary.estimatedProfit)} (${summary.estimatedUnits} ud.)`,
        L,
        y,
        width,
        8,
        muted,
      );
      y += 24;
    }
    doc.rect(L, y, width, 27).fill(green);
    let x = L;
    cols.forEach((c) => {
      text(
        c.label,
        x + 6,
        y + 9,
        c.width - 12,
        7.5,
        "#FFFFFF",
        true,
        c.right || c.money ? "right" : "left",
      );
      x += c.width;
    });
    y += 27;
    first = false;
    doc.restore();
  }
  const wrap = (value: string, colWidth: number) => {
    doc.font("Helvetica").fontSize(8);
    const result: string[] = [];
    for (const paragraph of value.split("\n")) {
      let current = "";
      for (const token of paragraph.split(/(\s+)/)) {
        if (doc.widthOfString(current + token) <= colWidth) {
          current += token;
          continue;
        }
        if (current.trim()) {
          result.push(current.trimEnd());
          current = "";
        }
        if (doc.widthOfString(token) <= colWidth) {
          current = token.trimStart();
          continue;
        }
        for (const char of token) {
          if (current && doc.widthOfString(current + char) > colWidth) {
            result.push(current);
            current = "";
          }
          current += char;
        }
      }
      result.push(current.trimEnd());
    }
    return result;
  };
  const cell = (row: ReportRow, c: Col) => {
    if (c.key === "Stock" && "Anterior" in row) return `${row.Anterior} -> ${row.Posterior}`;
    if (c.key === "Producto") return `${row.Producto}\n${row.SKU}`;
    if (c.key === "Variante")
      return String(
        row.Variante ||
          [row.Talla, row.Color].filter(Boolean).join(" / ") ||
          "Única",
      );
    if (c.key === "Motivo")
      return `${row.Motivo}${row.Observaciones ? "\n" + row.Observaciones : ""}`;
    if (c.key === "Fecha")
      return new Date(String(row.Fecha)).toLocaleString("es-GT", {
        timeZone: "America/Guatemala",
        dateStyle: "short",
        timeStyle: "short",
      });
    if (c.key === "Tipo")
      return (
        (
          { ENTRY: "Entrada", EXIT: "Salida", ADJUSTMENT: "Ajuste" } as Record<
            string,
            string
          >
        )[String(row.Tipo)] || String(row.Tipo)
      );
    return c.money ? currency(row[c.key] ?? 0) : String(row[c.key] ?? "");
  };
  header();
  rows.forEach((row, index) => {
    let parts = cols.map((c) => wrap(cell(row, c), c.width - 12));
    let offset = 0;
    const count = Math.max(...parts.map((p) => p.length));
    if (y + count * 11 + 12 > H - 61 && count * 11 + 12 <= H - 61 - 177) {
      doc.addPage();
      header();
    }
    while (offset < count) {
      let capacity = Math.floor((H - 61 - y - 12) / 11);
      if (capacity < 1) {
        doc.addPage();
        header();
        capacity = Math.floor((H - 61 - y - 12) / 11);
      }
      const take = Math.min(capacity, count - offset),
        height = take * 11 + 12;
      if (index % 2 === 0) doc.rect(L, y, width, height).fill("#F6F9F7");
      let x = L;
      cols.forEach((c, n) => {
        parts[n]
          .slice(offset, offset + take)
          .forEach((s, i) =>
            text(
              s,
              x + 6,
              y + 6 + i * 11,
              c.width - 12,
              8,
              ink,
              false,
              c.right || c.money ? "right" : "left",
            ),
          );
        x += c.width;
      });
      doc
        .moveTo(L, y + height)
        .lineTo(R, y + height)
        .strokeColor(line)
        .lineWidth(0.5)
        .stroke();
      y += height;
      offset += take;
      if (offset < count) {
        doc.addPage();
        header();
      }
    }
  });
  if (!rows.length) {
    text(
      "No hay registros para los filtros seleccionados.",
      L + 12,
      y + 22,
      width - 24,
      11,
      muted,
    );
    y += 65;
  }
  if (y + 43 > H - 61) {
    doc.addPage();
    header();
  }
  doc.rect(L, y + 9, width, 31).fill(pale);
  text(
    `TOTAL DEL REPORTE: ${meta.total} registros${meta.summary ? " | " + meta.summary.units + " unidades vendidas" : ""}`,
    L + 10,
    y + 20,
    width * 0.6,
    9,
    green,
    true,
  );
  if (meta.summary)
    text(
      "GANANCIA BRUTA: " + currency(meta.summary.profit),
      L + width * 0.6,
      y + 20,
      width * 0.4 - 10,
      10,
      green,
      true,
      "right",
    );
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    doc.page.margins.bottom = 0;
    doc
      .moveTo(L, H - 39)
      .lineTo(R, H - 39)
      .strokeColor(line)
      .stroke();
    text(
      report === "profit"
        ? "Ganancia bruta; no descuenta gastos, impuestos ni comisiones."
        : "Documento generado a partir de los registros del sistema.",
      L,
      H - 29,
      width - 110,
      7,
      muted,
    );
    text(
      `Página ${i + 1} de ${range.count}`,
      R - 105,
      H - 29,
      105,
      8,
      muted,
      false,
      "right",
    );
  }
  doc.end();
}
