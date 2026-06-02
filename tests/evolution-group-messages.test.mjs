import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

async function loadModule() {
  await mkdir("node_modules/.cache", { recursive: true });
  const outfile = "node_modules/.cache/evolution-group-messages-test.mjs";
  await build({
    entryPoints: ["lib/whatsapp/evolution-group-messages.ts"],
    bundle: true,
    platform: "node",
    format: "esm",
    outfile,
  });
  return import(pathToFileURL(process.cwd() + "/" + outfile).href);
}

test("normalizes Evolution group text messages", async () => {
  const { parseEvolutionGroupMessages } = await loadModule();

  const messages = parseEvolutionGroupMessages({
    event: "MESSAGES_UPSERT",
    data: {
      key: {
        id: "msg-1",
        remoteJid: "120363000000@g.us",
        participant: "555199999999@s.whatsapp.net",
        fromMe: false,
      },
      pushName: "Maria",
      message: { conversation: "Oi grupo" },
      messageTimestamp: 1710000000,
    },
  });

  assert.equal(messages.length, 1);
  assert.deepEqual(messages[0], {
    external_id: "msg-1",
    provider_group_id: "120363000000@g.us",
    sender_jid: "555199999999@s.whatsapp.net",
    sender_name: "Maria",
    direction: "inbound",
    body: "Oi grupo",
    message_at: "2024-03-09T16:00:00.000Z",
    raw_payload: {
      key: {
        id: "msg-1",
        remoteJid: "120363000000@g.us",
        participant: "555199999999@s.whatsapp.net",
        fromMe: false,
      },
      pushName: "Maria",
      message: { conversation: "Oi grupo" },
      messageTimestamp: 1710000000,
    },
  });
});

test("ignores individual messages", async () => {
  const { parseEvolutionGroupMessages } = await loadModule();

  const messages = parseEvolutionGroupMessages({
    event: "MESSAGES_UPSERT",
    data: {
      key: { id: "msg-2", remoteJid: "555199999999@s.whatsapp.net", fromMe: false },
      message: { conversation: "Oi" },
    },
  });

  assert.equal(messages.length, 0);
});
