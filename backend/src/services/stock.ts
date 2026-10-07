import { AppError } from "../utils/http";
export function calculateStock(
  type: "ENTRY" | "EXIT" | "ADJUSTMENT",
  stock: number,
  quantity?: number,
  newStock?: number,
) {
  const next =
    type === "ADJUSTMENT"
      ? newStock!
      : type === "ENTRY"
        ? stock + quantity!
        : stock - quantity!;
  if (!Number.isSafeInteger(next) || next < 0 || next > 2147483647)
    throw new AppError(409, "Stock insuficiente o cantidad fuera de rango.");
  if (next === stock)
    throw new AppError(422, "El ajuste debe cambiar el stock.");
  return { previousStock: stock, resultingStock: next, quantity: next - stock };
}
