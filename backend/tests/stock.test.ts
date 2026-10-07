import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateStock } from "../src/services/stock";
test("entrada preserva stock previo y delta", () =>
  assert.deepEqual(calculateStock("ENTRY", 10, 20), {
    previousStock: 10,
    resultingStock: 30,
    quantity: 20,
  }));
test("salida y agotamiento", () =>
  assert.deepEqual(calculateStock("EXIT", 10, 10), {
    previousStock: 10,
    resultingStock: 0,
    quantity: -10,
  }));
test("salida insuficiente rechazada", () =>
  assert.throws(() => calculateStock("EXIT", 3, 4)));
test("ajuste conserva diferencia negativa", () =>
  assert.deepEqual(calculateStock("ADJUSTMENT", 20, undefined, 18), {
    previousStock: 20,
    resultingStock: 18,
    quantity: -2,
  }));
test("ajuste sin cambio rechazado", () =>
  assert.throws(() => calculateStock("ADJUSTMENT", 20, undefined, 20)));
test("overflow de stock rechazado", () =>
  assert.throws(() => calculateStock("ENTRY", 2147483647, 1)));
