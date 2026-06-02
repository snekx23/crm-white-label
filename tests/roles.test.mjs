import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

async function loadModule() {
  await mkdir("node_modules/.cache", { recursive: true });
  const outfile = "node_modules/.cache/roles-test.mjs";
  await build({ entryPoints: ["lib/auth/roles.ts"], bundle: true, platform: "node", format: "esm", outfile });
  return import(pathToFileURL(process.cwd() + "/" + outfile).href + `?v=${Date.now()}`);
}

test("administrator and manager can manage operational setup", async () => {
  const { canManageOperationalSetup } = await loadModule();
  assert.equal(canManageOperationalSetup("owner"), true);
  assert.equal(canManageOperationalSetup("admin"), true);
  assert.equal(canManageOperationalSetup("gerente"), true);
  assert.equal(canManageOperationalSetup("atendente"), false);
});

test("attendant can operate leads but cannot manage integrations", async () => {
  const { canOperateLead, canManageIntegrations } = await loadModule();
  assert.equal(canOperateLead("atendente"), true);
  assert.equal(canManageIntegrations("atendente"), false);
  assert.equal(canManageIntegrations("admin"), true);
});
