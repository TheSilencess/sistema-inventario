import { app } from "./app";
import { env } from "./config";
import { db } from "./config/db";
async function main() {
  await db.$connect();
  const server = app.listen(env.PORT, () =>
    console.log(`API lista en puerto ${env.PORT}`),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => {
      server.close(() => {
        void db.$disconnect().then(() => process.exit(0));
      });
    });
}
main().catch(() => {
  console.error(
    "No fue posible iniciar API. Revise conexión PostgreSQL y variables de entorno.",
  );
  process.exitCode = 1;
});
