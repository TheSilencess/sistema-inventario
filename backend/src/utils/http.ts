import { Request, Response, NextFunction, RequestHandler } from "express";
import { Prisma, Role } from "@prisma/client";
import { ZodError, z } from "zod";
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const route =
  (fn: (req: Request, res: Response) => Promise<unknown>): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
export const ok = (res: Response, data: unknown, status = 200) =>
  res.status(status).json({ data });
export const id = (value: unknown) => z.string().uuid().parse(value);
export const pageQuery = z.object({
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().max(120).default(""),
  sortBy: z.enum(["createdAt", "name", "sku"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});
export function pagination(query: unknown) {
  const q = pageQuery.parse(query);
  return { ...q, skip: (q.page - 1) * q.limit };
}
export const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  createdAt: true,
  updatedAt: true,
} as const;
export const audit = (
  tx: Prisma.TransactionClient,
  userId: string,
  action: string,
  entity: string,
  entityId: string,
  metadata: Prisma.InputJsonValue = {},
) =>
  tx.auditLog.create({ data: { userId, action, entity, entityId, metadata } });
declare global {
  namespace Express {
    interface Request {
      actor: { id: string; role: Role; name: string };
    }
  }
}
export function errors(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (
    error instanceof SyntaxError &&
    "status" in error &&
    error.status === 400
  ) {
    res.status(400).json({ error: { message: "JSON inválido." } });
    return;
  }
  if (error instanceof ZodError) {
    res.status(422).json({
      error: {
        message: "Revise los datos ingresados.",
        details: error.flatten(),
      },
    });
    return;
  }
  if (error instanceof AppError) {
    res.status(error.status).json({ error: { message: error.message } });
    return;
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    const status =
      error.code === "P2002"
        ? 409
        : error.code === "P2025"
          ? 404
          : error.code === "P2003"
            ? 422
            : error.code === "P2034"
              ? 409
              : 500;
    res.status(status).json({
      error: {
        message:
          status === 409
            ? "Registro duplicado o conflicto; actualice e intente nuevamente."
            : status === 404
              ? "Registro no encontrado."
              : status === 422
                ? "Referencia inválida."
                : "Error interno.",
      },
    });
    return;
  }
  console.error(
    "Error interno:",
    error instanceof Error ? error.name : "Unknown",
  );
  res.status(500).json({ error: { message: "Ocurrió un error interno." } });
}
