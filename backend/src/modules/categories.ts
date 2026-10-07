import { Router } from "express";
import { z } from "zod";
import { db, transaction } from "../config/db";
import { route, ok, id, audit } from "../utils/http";
export const categoriesRouter = Router();
const schema = z
  .object({
    name: z.string().trim().min(2).max(100),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  })
  .strict();
categoriesRouter.get(
  "/",
  route(async (_req, res) =>
    ok(res, await db.category.findMany({ orderBy: { name: "asc" } })),
  ),
);
categoriesRouter.post(
  "/",
  route(async (req, res) => {
    const data = schema.parse(req.body);
    return ok(
      res,
      await transaction(async (tx) => {
        const row = await tx.category.create({ data });
        await audit(tx, req.actor.id, "CATEGORY_CREATED", "Category", row.id, {
          name: row.name,
        });
        return row;
      }),
      201,
    );
  }),
);
categoriesRouter.patch(
  "/:id",
  route(async (req, res) => {
    const categoryId = id(req.params.id);
    const data = schema.partial().parse(req.body);
    return ok(
      res,
      await transaction(async (tx) => {
        const row = await tx.category.update({
          where: { id: categoryId },
          data,
        });
        await audit(
          tx,
          req.actor.id,
          "CATEGORY_UPDATED",
          "Category",
          row.id,
          data,
        );
        return row;
      }),
    );
  }),
);
