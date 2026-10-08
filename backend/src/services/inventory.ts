import { transaction } from "../config/db";
import { AppError, audit } from "../utils/http";
import { MovementInput } from "../validators/inventory";
import { calculateStock } from "./stock";
export async function recordMovement(input: MovementInput, userId: string) {
  const isSale =
    input.type === "EXIT" &&
    (input.isSale ?? input.reason.trim().toLowerCase() === "venta");
  return transaction(async (tx) => {
    const existing = await tx.inventoryMovement.findUnique({
      where: { requestId: input.requestId },
    });
    if (existing) {
      const expectedQuantity =
        input.type === "ADJUSTMENT" ? input.newStock : input.quantity;
      if (
        existing.userId !== userId ||
        existing.variantId !== input.variantId ||
        existing.type !== input.type ||
        existing.reason !== input.reason ||
        existing.notes !== input.notes ||
        existing.isSale !== isSale ||
        (input.type === "ADJUSTMENT"
          ? existing.resultingStock
          : Math.abs(existing.quantity)) !== expectedQuantity
      )
        throw new AppError(409, "Identificador de operación ya utilizado.");
      return existing;
    }
    const v = await tx.productVariant.findUnique({
      where: { id: input.variantId },
      include: { product: true },
    });
    if (!v) throw new AppError(404, "Variante no encontrada.");
    if (v.status !== "ACTIVE" || v.product.status !== "ACTIVE")
      throw new AppError(409, "El producto o la variante están inactivos.");
    if (input.type === "ADJUSTMENT" && input.expectedStock !== v.stock)
      throw new AppError(
        409,
        "El stock cambió. Actualice el conteo antes de ajustar.",
      );
    const calculated = calculateStock(
      input.type,
      v.stock,
      "quantity" in input ? input.quantity : undefined,
      "newStock" in input ? input.newStock : undefined,
    );
    await tx.productVariant.update({
      where: { id: v.id },
      data: { stock: calculated.resultingStock },
    });
    const row = await tx.inventoryMovement.create({
      data: {
        variantId: v.id,
        userId: userId,
        type: input.type,
        reason: input.reason,
        notes: input.notes,
        requestId: input.requestId,
        isSale,
        unitCost: v.product.purchasePrice,
        unitSalePrice: v.product.salePrice,
        ...calculated,
      },
    });
    await audit(tx, userId, input.type, "InventoryMovement", row.id, {
      variantId: v.id,
      ...calculated,
    });
    return row;
  });
}
