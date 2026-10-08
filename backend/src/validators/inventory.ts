import { z } from "zod";
const common = {
  variantId: z.string().uuid(),
  reason: z.string().trim().min(2).max(200),
  notes: z.string().max(2000).default(""),
  requestId: z.string().uuid(),
};
export const movement = z.discriminatedUnion("type", [
  z
    .object({
      ...common,
      type: z.literal("ENTRY"),
      quantity: z.number().int().min(1).max(1000000),
    })
    .strict(),
  z
    .object({
      ...common,
      type: z.literal("EXIT"),
      isSale: z.boolean().optional(),
      quantity: z.number().int().min(1).max(1000000),
    })
    .strict(),
  z
    .object({
      ...common,
      type: z.literal("ADJUSTMENT"),
      newStock: z.number().int().min(0).max(1000000),
      expectedStock: z.number().int().min(0),
    })
    .strict(),
]);

export type MovementInput = z.infer<typeof movement>;
