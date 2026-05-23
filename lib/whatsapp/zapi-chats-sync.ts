import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { WhatsAppAccount } from "@/lib/supabase/database.types";
import { normalizeWhatsAppLid } from "./lid";
import { normalizeWhatsAppPhone, phonesEquivalent } from "./phone";
type ServiceClient = SupabaseClient<Database>;

type ZapiChatRow = {
  phone?: string;
  lid?: string;
  name?: string;
};

async function fetchZapiChatRows(account: WhatsAppAccount): Promise<ZapiChatRow[]> {
  const creds = account.credentials as { instance_id?: string; token?: string; client_token?: string };
  const id = creds.instance_id?.trim();
  const token = creds.token?.trim();
  if (!id || !token) return [];

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const clientToken = creds.client_token?.trim();
  if (clientToken) headers["Client-Token"] = clientToken;

  const rows: ZapiChatRow[] = [];
  for (let page = 1; page <= 5; page++) {
    const res = await fetch(
      `https://api.z-api.io/instances/${encodeURIComponent(id)}/token/${encodeURIComponent(token)}/chats?page=${page}&pageSize=50`,
      { headers },
    );
    if (!res.ok) break;

    const data = (await res.json()) as ZapiChatRow[] | { value?: ZapiChatRow[] };
    const batch = Array.isArray(data) ? data : (data.value ?? []);
    if (batch.length === 0) break;
    rows.push(...batch);
  }
  return rows;
}

/** Descobre o @lid do próprio número conectado (chat "mensagem para mim"). */
export async function syncOwnerLidFromZapiChats(account: WhatsAppAccount): Promise<string | null> {
  const connected = normalizeWhatsAppPhone(account.phone_number ?? "");
  if (!connected) return null;

  const rows = await fetchZapiChatRows(account);
  for (const chat of rows) {
    const phone = chat.phone ? normalizeWhatsAppPhone(chat.phone) : null;
    if (!phone || !phonesEquivalent(phone, connected)) continue;
    const lid = normalizeWhatsAppLid(chat.lid ?? null);
    if (lid) return lid;
  }
  return null;
}

/** Vincula @lid dos chats Z-API aos leads pelo telefone. */
export async function syncLeadLidsFromZapiChats(
  supabase: ServiceClient,
  account: WhatsAppAccount,
): Promise<number> {
  if (account.provider !== "zapi") return 0;

  const rows = await fetchZapiChatRows(account);
  if (rows.length === 0) return 0;

  let updated = 0;
  for (const chat of rows) {
    const lid = normalizeWhatsAppLid(chat.lid ?? null);
    const phone = chat.phone ? normalizeWhatsAppPhone(chat.phone) : null;
    if (!lid || !phone) continue;

    const { data: leads } = await supabase
      .from("leads")
      .select("id, whatsapp_lid")
      .eq("tenant_id", account.tenant_id)
      .eq("phone", phone);

    for (const lead of leads ?? []) {
      if ((lead as { whatsapp_lid?: string | null }).whatsapp_lid === lid) continue;
      await supabase
        .from("leads")
        .update({ whatsapp_lid: lid })
        .eq("id", lead.id)
        .eq("tenant_id", account.tenant_id);
      updated++;
    }
  }

  return updated;
}
