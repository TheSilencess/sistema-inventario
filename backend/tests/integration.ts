import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { app } from "../src/app";
import { db } from "../src/config/db";
import { env } from "../src/config";
async function main() {
  if (process.env.RUN_INTEGRATION_TESTS !== "true")
    throw new Error(
      "Use una BD de pruebas y establezca RUN_INTEGRATION_TESTS=true.",
    );
  const password = process.env.TEST_ADMIN_PASSWORD;
  if (!password) throw new Error("Configure TEST_ADMIN_PASSWORD.");
  const suffix = randomUUID().slice(0, 8);
  const createdUsers: string[] = [],
    products: string[] = [],
    cats: string[] = [],
    families: string[] = [];
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) =>
    server.once("listening", () => resolve()),
  );
  const address = server.address();
  if (!address || typeof address === "string")
    throw new Error("Servidor inválido");
  const base = `http://127.0.0.1:${address.port}/api`;
  type JsonObject = Record<string, unknown>;
  async function call(
    path: string,
    method = "GET",
    body?: unknown,
    token?: string,
    cookie?: string,
  ) {
    const response = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Origin: env.FRONTEND_URL,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return response;
  }
  async function data<T>(r: Response) {
    assert.ok(r.ok, `HTTP ${r.status}: ${await r.clone().text()}`);
    return ((await r.json()) as { data: T }).data;
  }
  let adminId = "";
  try {
    const login = await call("/auth/login", "POST", {
      email: process.env.SEED_ADMIN_EMAIL || "jeremojuarez@gmail.com",
      password,
    });
    const cookie = login.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    const admin = await data<{ accessToken: string; user: { id: string } }>(
      login,
    );
    adminId = admin.user.id;
    let token = admin.accessToken;
    assert.ok(!JSON.stringify(admin).includes("passwordHash"));
    assert.equal((await call("/products")).status, 401);
    const cat = await data<{ id: string }>(
      await call("/categories", "POST", { name: "Test " + suffix }, token),
    );
    cats.push(cat.id);
    const employee = await data<{ id: string }>(
      await call(
        "/users",
        "POST",
        {
          name: "Empleado " + suffix,
          email: `test-${suffix}@example.com`,
          password: "Integration123!#",
          role: "EMPLOYEE",
        },
        token,
      ),
    );
    createdUsers.push(employee.id);
    const employeeLogin = await data<{ accessToken: string }>(
      await call("/auth/login", "POST", {
        email: `test-${suffix}@example.com`,
        password: "Integration123!#",
      }),
    );
    const et = employeeLogin.accessToken;
    assert.equal((await call("/users", "GET", undefined, et)).status, 403);
    assert.equal(
      (await call("/users/" + adminId, "PATCH", { role: "EMPLOYEE" }, et))
        .status,
      403,
    );
    const p = await data<{
      id: string;
      variants: { id: string; stock: number }[];
    }>(
      await call(
        "/products",
        "POST",
        {
          name: "Zapato test",
          sku: "P-" + suffix,
          categoryId: cat.id,
          purchasePrice: "100.25",
          salePrice: "150.00",
          hasVariants: true,
          variants: [
            {
              sku: "V-" + suffix,
              size: "42",
              color: "Blanco",
              minimumStock: 5,
            },
            {
              sku: "V2-" + suffix,
              size: "43",
              color: "Negro",
              minimumStock: 5,
            },
          ],
        },
        et,
      ),
    );
    products.push(p.id);
    assert.equal(p.variants[0].stock, 0);
    const variantId = p.variants[0].id;
    assert.equal(
      (
        await call(
          "/products/" + p.id + "/variants/" + variantId,
          "PATCH",
          { stock: 99 },
          et,
        )
      ).status,
      422,
    );
    const entry = {
      type: "ENTRY",
      variantId,
      quantity: 20,
      reason: "Compra prueba",
      requestId: randomUUID(),
    };
    const first = await data<{ id: string; resultingStock: number }>(
      await call("/inventory/movements", "POST", entry, et),
    );
    assert.equal(first.resultingStock, 20);
    const repeat = await data<{ id: string }>(
      await call("/inventory/movements", "POST", entry, et),
    );
    assert.equal(repeat.id, first.id);
    assert.equal(
      (
        await call(
          "/inventory/movements",
          "POST",
          { ...entry, quantity: 21 },
          et,
        )
      ).status,
      409,
    );
    assert.equal(
      (
        await call(
          "/inventory/movements",
          "POST",
          {
            type: "EXIT",
            variantId,
            quantity: 21,
            reason: "Exceso",
            requestId: randomUUID(),
          },
          et,
        )
      ).status,
      409,
    );
    const exit = await data<{ resultingStock: number }>(
      await call(
        "/inventory/movements",
        "POST",
        {
          type: "EXIT",
          variantId,
          quantity: 4,
          reason: "Venta",
          requestId: randomUUID(),
        },
        et,
      ),
    );
    assert.equal(exit.resultingStock, 16);
    const adjustment = await data<{ resultingStock: number; quantity: number }>(
      await call(
        "/inventory/movements",
        "POST",
        {
          type: "ADJUSTMENT",
          variantId,
          newStock: 10,
          expectedStock: 16,
          reason: "Conteo físico",
          requestId: randomUUID(),
        },
        et,
      ),
    );
    assert.equal(adjustment.resultingStock, 10);
    assert.equal(adjustment.quantity, -6);
    assert.equal(
      (
        await call(
          "/inventory/movements",
          "POST",
          {
            type: "ADJUSTMENT",
            variantId,
            newStock: 8,
            expectedStock: 16,
            reason: "Conteo obsoleto",
            requestId: randomUUID(),
          },
          et,
        )
      ).status,
      409,
    );
    // Two withdrawals compete for 10 units. Exactly one can remove 8.
    const competing = await Promise.all(
      [1, 2].map(() =>
        call(
          "/inventory/movements",
          "POST",
          {
            type: "EXIT",
            variantId,
            quantity: 8,
            reason: "Concurrente",
            requestId: randomUUID(),
          },
          et,
        ),
      ),
    );
    assert.deepEqual(competing.map((r) => r.status).sort(), [201, 409]);
    assert.equal(
      (await db.productVariant.findUniqueOrThrow({ where: { id: variantId } }))
        .stock,
      2,
    );
    const history = await data<{
      total: number;
      items: { user: { id: string } }[];
    }>(await call("/movements?productId=" + p.id, "GET", undefined, et));
    assert.equal(history.total, 4);
    assert.ok(history.items.every((i) => i.user.id === employee.id));
    const inventory = await data<{ total: number }>(
      await call(
        "/inventory?categoryId=" + cat.id + "&stockStatus=LOW",
        "GET",
        undefined,
        et,
      ),
    );
    assert.equal(inventory.total, 1);
    const out = await data<{ total: number }>(
      await call(
        "/inventory?categoryId=" + cat.id + "&stockStatus=OUT",
        "GET",
        undefined,
        et,
      ),
    );
    assert.equal(out.total, 1);
    await data<JsonObject>(await call("/dashboard", "GET", undefined, et));
    const csv = await call(
      "/reports?report=inventory&format=csv&categoryId=" + cat.id,
      "GET",
      undefined,
      et,
    );
    assert.ok(csv.ok);
    assert.ok((await csv.text()).includes("Zapato test"));
    const pdf = await call(
      "/reports?report=entry&format=pdf&categoryId=" + cat.id,
      "GET",
      undefined,
      et,
    );
    assert.ok(pdf.ok);
    assert.equal(
      Buffer.from(await pdf.arrayBuffer())
        .subarray(0, 4)
        .toString(),
      "%PDF",
    );
    await data(
      await call("/products/" + p.id, "PATCH", { name: "Zapato editado" }, et),
    );
    await data(
      await call(
        "/products/" + p.id + "/variants/" + variantId,
        "PATCH",
        { minimumStock: 3 },
        et,
      ),
    );
    await data(
      await call("/products/" + p.id, "PATCH", { status: "INACTIVE" }, et),
    );
    assert.equal(
      (
        await call(
          "/inventory/movements",
          "POST",
          { ...entry, requestId: randomUUID() },
          et,
        )
      ).status,
      409,
    );
    await data(
      await call("/users/" + employee.id, "PATCH", { active: false }, token),
    );
    assert.equal((await call("/products", "GET", undefined, et)).status, 401);
    assert.equal(
      (await call("/users/" + adminId, "PATCH", { active: false }, token))
        .status,
      409,
    );
    const refreshed = await call(
      "/auth/refresh",
      "POST",
      {},
      undefined,
      cookie,
    );
    const currentCookie = refreshed.headers.get("set-cookie")?.split(";")[0];
    token = (await data<{ accessToken: string }>(refreshed)).accessToken;
    assert.equal(
      (await call("/auth/refresh", "POST", {}, undefined, cookie)).status,
      401,
    );
    assert.equal(
      (await call("/products", "GET", undefined, token)).status,
      401,
    );
    const login2 = await call("/auth/login", "POST", {
      email: process.env.SEED_ADMIN_EMAIL || "jeremojuarez@gmail.com",
      password,
    });
    const cookie2 = login2.headers.get("set-cookie")?.split(";")[0];
    const token2 = (await data<{ accessToken: string }>(login2)).accessToken;
    await data(await call("/auth/logout", "POST", {}, undefined, cookie2));
    assert.equal(
      (await call("/products", "GET", undefined, token2)).status,
      401,
    );
    void currentCookie;
    console.log(
      "API integration PASS: auth, roles, CRUD, variantes, stock, concurrencia, historial, dashboard, CSV/PDF, revocación.",
    );
  } finally {
    const variantIds = (
      await db.productVariant.findMany({
        where: { productId: { in: products } },
        select: { id: true },
      })
    ).map((v) => v.id);
    await db.auditLog.deleteMany({
      where: {
        OR: [
          { userId: { in: createdUsers } },
          {
            entityId: {
              in: [...createdUsers, ...products, ...cats, ...variantIds],
            },
          },
        ],
      },
    });
    const movementIds = (
      await db.inventoryMovement.findMany({
        where: { variantId: { in: variantIds } },
        select: { id: true },
      })
    ).map((m) => m.id);
    await db.auditLog.deleteMany({ where: { entityId: { in: movementIds } } });
    await db.inventoryMovement.deleteMany({
      where: { variantId: { in: variantIds } },
    });
    await db.productVariant.deleteMany({ where: { id: { in: variantIds } } });
    await db.product.deleteMany({ where: { id: { in: products } } });
    await db.category.deleteMany({ where: { id: { in: cats } } });
    await db.user.deleteMany({ where: { id: { in: createdUsers } } });
    void families;
    await new Promise<void>((resolve, reject) =>
      server.close((e) => (e ? reject(e) : resolve())),
    );
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
