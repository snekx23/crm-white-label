import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

async function loadModule() {
  await mkdir("node_modules/.cache", { recursive: true });
  const outfile = "node_modules/.cache/lead-assignment-test.mjs";
  await build({ entryPoints: ["lib/leads/assignment.ts"], bundle: true, platform: "node", format: "esm", outfile });
  return import(pathToFileURL(process.cwd() + "/" + outfile).href + `?v=${Date.now()}`);
}

test("chooses the available attendant least recently assigned", async () => {
  const { chooseRoundRobinAttendant } = await loadModule();
  const selected = chooseRoundRobinAttendant([
    { user_id: "newer", is_available: true, last_assigned_at: "2026-06-01T11:00:00.000Z" },
    { user_id: "never", is_available: true, last_assigned_at: null },
    { user_id: "older", is_available: true, last_assigned_at: "2026-06-01T09:00:00.000Z" },
  ]);
  assert.equal(selected?.user_id, "never");
});

test("returns null when no attendant is available", async () => {
  const { chooseRoundRobinAttendant } = await loadModule();
  assert.equal(chooseRoundRobinAttendant([{ user_id: "busy", is_available: false, last_assigned_at: null }]), null);
});
