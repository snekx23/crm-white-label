import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(path) {
  return Object.fromEntries(
    fs
      .readFileSync(path, "utf8")
      .split(/\r?\n/)
      .filter(Boolean)
      .filter((line) => !line.trim().startsWith("#"))
      .map((line) => {
        const index = line.indexOf("=");
        return [line.slice(0, index), line.slice(index + 1).replace(/^['"]|['"]$/g, "")];
      }),
  );
}

function chunks(rows, size) {
  const out = [];
  for (let index = 0; index < rows.length; index += size) out.push(rows.slice(index, index + size));
  return out;
}

const env = loadEnv(".env.local");
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const { data: account, error: accountError } = await supabase
  .from("whatsapp_accounts")
  .select("*")
  .eq("provider", "evolution")
  .eq("is_active", true)
  .maybeSingle();

if (accountError) throw accountError;
if (!account) throw new Error("Nenhuma conta Evolution ativa encontrada.");

const credentials = account.credentials ?? {};
const baseUrl = String(credentials.base_url ?? "").replace(/\/$/, "");
const instance = encodeURIComponent(String(credentials.instance ?? ""));
const apiKey = String(credentials.api_key ?? "");

const response = await fetch(`${baseUrl}/group/fetchAllGroups/${instance}?getParticipants=false`, {
  headers: { apikey: apiKey },
});
const groups = await response.json();

if (!response.ok || !Array.isArray(groups)) {
  throw new Error(`Evolution retornou ${response.status}: ${JSON.stringify(groups).slice(0, 500)}`);
}

const rows = groups
  .filter((group) => group && typeof group === "object" && String(group.id ?? "").includes("@g.us"))
  .map((group) => {
    const timestamp =
      typeof group.subjectTime === "number"
        ? group.subjectTime
        : typeof group.creation === "number"
          ? group.creation
          : Math.floor(Date.now() / 1000);

    return {
      tenant_id: account.tenant_id,
      whatsapp_account_id: account.id,
      provider_group_id: String(group.id),
      subject: String(group.subject || group.id),
      description: typeof group.desc === "string" ? group.desc : null,
      owner_jid:
        typeof group.owner === "string"
          ? group.owner
          : typeof group.subjectOwner === "string"
            ? group.subjectOwner
            : null,
      participant_count: typeof group.size === "number" ? group.size : null,
      last_event_type: "GROUPS_UPSERT",
      last_event_at: new Date(timestamp * 1000).toISOString(),
      raw_payload: group,
    };
  });

let upserted = 0;
for (const part of chunks(rows, 100)) {
  const { error } = await supabase
    .from("whatsapp_groups")
    .upsert(part, { onConflict: "tenant_id,provider_group_id" });
  if (error) throw error;
  upserted += part.length;
}

console.log(JSON.stringify({ fetched: groups.length, upserted }, null, 2));
