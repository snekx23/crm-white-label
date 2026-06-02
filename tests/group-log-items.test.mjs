import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

async function loadModule() {
  await mkdir("node_modules/.cache", { recursive: true });
  const outfile = "node_modules/.cache/group-log-items-test.mjs";
  await build({
    entryPoints: ["lib/chat/group-log-items.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
  });
  return import(pathToFileURL(process.cwd() + "/" + outfile).href);
}

test("builds group list items from group and label logs", async () => {
  const { buildWhatsAppGroupItemsFromLogs } = await loadModule();

  const items = buildWhatsAppGroupItemsFromLogs([
    {
      id: "group-log",
      event_type: "GROUPS_UPSERT",
      contact_lid: "120363@g.us",
      payload: {
        provider_group_id: "120363@g.us",
        subject: "Grupo Comercial",
        participant_count: 24,
        last_event_at: "2026-05-25T12:00:00.000Z",
      },
      created_at: "2026-05-25T12:00:00.000Z",
    },
    {
      id: "label-log",
      event_type: "GROUP_LABEL_ADD",
      contact_lid: "120363@g.us",
      payload: {
        provider_group_id: "120363@g.us",
        label: { id: "label-1", name: "Cliente", color: "#22c55e" },
      },
      created_at: "2026-05-25T12:01:00.000Z",
    },
  ]);

  assert.equal(items.length, 1);
  assert.equal(items[0].subject, "Grupo Comercial");
  assert.deepEqual(items[0].labels, [{ id: "label-1", name: "Cliente", color: "#22c55e" }]);
});

test("removes labels using remove events", async () => {
  const { buildWhatsAppGroupItemsFromLogs } = await loadModule();

  const items = buildWhatsAppGroupItemsFromLogs([
    {
      id: "group-log",
      event_type: "GROUPS_UPSERT",
      contact_lid: "120363@g.us",
      payload: { provider_group_id: "120363@g.us", subject: "Grupo Comercial" },
      created_at: "2026-05-25T12:00:00.000Z",
    },
    {
      id: "label-log",
      event_type: "GROUP_LABEL_ADD",
      contact_lid: "120363@g.us",
      payload: { provider_group_id: "120363@g.us", label: { id: "label-1", name: "Cliente" } },
      created_at: "2026-05-25T12:01:00.000Z",
    },
    {
      id: "remove-log",
      event_type: "GROUP_LABEL_REMOVE",
      contact_lid: "120363@g.us",
      payload: { provider_group_id: "120363@g.us", label_id: "label-1" },
      created_at: "2026-05-25T12:02:00.000Z",
    },
  ]);

  assert.equal(items.length, 1);
  assert.deepEqual(items[0].labels, []);
});
