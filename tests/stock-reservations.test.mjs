import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

async function loadModule() {
  await mkdir("node_modules/.cache", { recursive: true });
  const outfile = "node_modules/.cache/stock-reservations-test.mjs";
  await build({ entryPoints: ["lib/estoque/reservations.ts"], bundle: true, platform: "node", format: "esm", outfile });
  return import(pathToFileURL(process.cwd() + "/" + outfile).href + `?v=${Date.now()}`);
}

test("calculates available stock after active reservations", async () => {
  const { availableStock } = await loadModule();
  assert.equal(availableStock(10, [{ quantity: 3, status: "active" }, { quantity: 2, status: "released" }]), 7);
});

test("rejects reservation above availability", async () => {
  const { assertReservationFits } = await loadModule();
  assert.throws(() => assertReservationFits(2, 3), /Estoque insuficiente/);
});
