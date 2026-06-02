import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

async function loadModule() {
  await mkdir("node_modules/.cache", { recursive: true });
  const outfile = "node_modules/.cache/group-items-test.mjs";
  await build({
    entryPoints: ["lib/chat/group-items.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
  });
  return import(pathToFileURL(process.cwd() + "/" + outfile).href);
}

test("builds group list items with sorted labels", async () => {
  const { buildWhatsAppGroupItems } = await loadModule();

  const items = buildWhatsAppGroupItems(
    [
      {
        id: "group-row",
        provider_group_id: "120363@g.us",
        subject: "Grupo Comercial",
        description: "Clientes ativos",
        participant_count: 24,
        last_event_type: "GROUPS_UPSERT",
        last_event_at: null,
        updated_at: "2026-05-25T12:00:00.000Z",
      },
    ],
    [
      {
        group_id: "group-row",
        whatsapp_group_labels: { id: "2", name: "Prioridade", color: "#ef4444" },
      },
      {
        group_id: "group-row",
        whatsapp_group_labels: { id: "1", name: "Cliente", color: "#22c55e" },
      },
    ],
  );

  assert.equal(items.length, 1);
  assert.equal(items[0].subject, "Grupo Comercial");
  assert.deepEqual(items[0].labels.map((label) => label.name), ["Cliente", "Prioridade"]);
});

test("uses latest group message as preview and ordering signal", async () => {
  const { buildWhatsAppGroupItems } = await loadModule();

  const items = buildWhatsAppGroupItems(
    [
      {
        id: "old-group",
        provider_group_id: "120363111@g.us",
        subject: "Grupo antigo",
        description: null,
        participant_count: 10,
        last_event_type: "GROUPS_UPSERT",
        last_event_at: "2026-02-10T12:00:00.000Z",
        updated_at: "2026-05-25T12:00:00.000Z",
      },
      {
        id: "active-group",
        provider_group_id: "120363222@g.us",
        subject: "Grupo ativo",
        description: null,
        participant_count: 15,
        last_event_type: "GROUPS_UPSERT",
        last_event_at: "2026-01-10T12:00:00.000Z",
        updated_at: "2026-05-25T12:00:00.000Z",
      },
    ],
    [],
    [
      {
        contact_lid: "120363222@g.us",
        from_me: true,
        created_at: "2026-05-25T16:30:00.000Z",
        payload: {
          provider_group_id: "120363222@g.us",
          direction: "outbound",
          body: "Mensagem recente do grupo",
          message_at: "2026-05-25T16:30:00.000Z",
        },
      },
    ],
  );

  assert.equal(items[0].id, "active-group");
  assert.equal(items[0].lastPreview, "Mensagem recente do grupo");
  assert.equal(items[0].lastDirection, "outbound");
  assert.equal(items[0].lastAt, "2026-05-25T16:30:00.000Z");
  assert.equal(items[1].id, "old-group");
});
