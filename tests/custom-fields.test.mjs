import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

async function loadModule() {
  await mkdir("node_modules/.cache", { recursive: true });
  const outfile = "node_modules/.cache/custom-fields-test.mjs";
  await build({ entryPoints: ["lib/leads/custom-fields.ts"], bundle: true, platform: "node", format: "esm", outfile });
  return import(pathToFileURL(process.cwd() + "/" + outfile).href + `?v=${Date.now()}`);
}

test("normalizes typed technical fields", async () => {
  const { normalizeCustomFieldValues } = await loadModule();
  const values = normalizeCustomFieldValues(
    [
      { key: "comprimento_cm", field_type: "number", is_required: true },
      { key: "proxima_manutencao", field_type: "date", is_required: false },
      { key: "possui_fotos", field_type: "boolean", is_required: false },
    ],
    { comprimento_cm: "55", proxima_manutencao: "2026-07-10", possui_fotos: "true" },
  );
  assert.deepEqual(values, { comprimento_cm: 55, proxima_manutencao: "2026-07-10", possui_fotos: true });
});

test("rejects missing required technical field", async () => {
  const { normalizeCustomFieldValues } = await loadModule();
  assert.throws(() => normalizeCustomFieldValues([{ key: "metodo", field_type: "text", is_required: true }], {}), /metodo/);
});
