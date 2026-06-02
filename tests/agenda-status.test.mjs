import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

async function loadModule() {
  await mkdir("node_modules/.cache", { recursive: true });
  const outfile = "node_modules/.cache/agenda-status-test.mjs";
  await build({ entryPoints: ["lib/agenda/status.ts"], bundle: true, platform: "node", format: "esm", outfile });
  return import(pathToFileURL(process.cwd() + "/" + outfile).href + `?v=${Date.now()}`);
}

test("allows the supported appointment transitions", async () => {
  const { canTransitionAppointment } = await loadModule();
  assert.equal(canTransitionAppointment("scheduled", "confirmed"), true);
  assert.equal(canTransitionAppointment("confirmed", "completed"), true);
  assert.equal(canTransitionAppointment("cancelled", "confirmed"), false);
});
