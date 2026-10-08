ALTER TABLE "InventoryMovement" ADD COLUMN "isSale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "unitCost" DECIMAL(12,2), ADD COLUMN "unitSalePrice" DECIMAL(12,2);
UPDATE "InventoryMovement" SET "isSale" = true WHERE type='EXIT' AND LOWER(TRIM(reason))='venta';
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "movement_sale_exit_only" CHECK (NOT "isSale" OR type='EXIT');
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "movement_price_snapshot" CHECK (("unitCost" IS NULL AND "unitSalePrice" IS NULL) OR ("unitCost" IS NOT NULL AND "unitSalePrice" IS NOT NULL AND "unitCost">=0 AND "unitSalePrice">=0));
CREATE INDEX "InventoryMovement_isSale_createdAt_idx" ON "InventoryMovement"("isSale", "createdAt");
