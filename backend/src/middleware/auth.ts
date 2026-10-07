import { RequestHandler } from "express";
import jwt from "jsonwebtoken";
import { db } from "../config/db";
import { env } from "../config";
import { AppError } from "../utils/http";
export const auth: RequestHandler = (req, _res, next) => {
  void validate(req)
    .then(() => next())
    .catch(next);
};
async function validate(req: Parameters<RequestHandler>[0]) {
  const token = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new AppError(401, "Inicie sesión.");
  let p;
  try {
    p = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ["HS256"],
      issuer: "bodega-api",
      audience: "bodega-web",
    });
  } catch {
    throw new AppError(401, "Sesión vencida.");
  }
  if (
    typeof p === "string" ||
    typeof p.sub !== "string" ||
    typeof p.ver !== "number" ||
    typeof p.sid !== "string"
  )
    throw new AppError(401, "Token inválido.");
  const user = await db.user.findUnique({ where: { id: p.sub } });
  if (
    !user?.active ||
    user.tokenVersion !== p.ver ||
    !(await db.refreshToken.findFirst({
      where: {
        userId: user.id,
        familyId: p.sid,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
    }))
  )
    throw new AppError(401, "Sesión no válida.");
  req.actor = { id: user.id, role: user.role, name: user.name };
}
export const admin: RequestHandler = (req, _res, next) => {
  if (req.actor.role !== "ADMIN")
    next(new AppError(403, "Solo un administrador puede gestionar usuarios."));
  else next();
};
