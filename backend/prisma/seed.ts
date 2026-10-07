import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const db = new PrismaClient();
async function main() {
  const email = (
    process.env.SEED_ADMIN_EMAIL || "jeremojuarez@gmail.com"
  ).toLowerCase();
  for (const name of ["Zapatos", "Ropa", "Accesorios"])
    await db.category.upsert({ where: { name }, update: {}, create: { name } });
  if (!(await db.user.findUnique({ where: { email } }))) {
    const password = process.env.SEED_ADMIN_PASSWORD;
    if (!password || password.length < 12)
      throw new Error(
        "Configure SEED_ADMIN_PASSWORD (mínimo 12 caracteres) antes del seed.",
      );
    await db.user.create({
      data: {
        email,
        name: "Administrador Principal",
        role: "ADMIN",
        passwordHash: await bcrypt.hash(password, 12),
      },
    });
  }
  console.log("Seed completado; administrador y categorías disponibles.");
}
main()
  .catch(() => {
    console.error("Seed falló. Revise PostgreSQL y SEED_ADMIN_PASSWORD.");
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
