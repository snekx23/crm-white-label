import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { WhatsAppAccount } from "@/lib/supabase/database.types";
import { syncLeadLidsFromZapiChats, syncOwnerLidFromZapiChats } from "./zapi-chats-sync";
import { ZapiProvider } from "./zapi";

type ServiceClient = SupabaseClient<Database>;

type ZapiCreds = Record<string, unknown> & {
  notify_sent_by_me_enabled?: boolean;
  receive_callback_sent_by_me?: boolean;
  webhooks_synced_at?: string;
  zapi_received_callback_url?: string;
  owner_whatsapp_lid?: string | null;
};

const SYNC_INTERVAL_MS = 60 * 60 * 1000;

function webhookBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!url) throw new Error("NEXT_PUBLIC_APP_URL nao configurada");
  return url;
}

/** Alinha painel Z-API + API: URL do webhook e mensagens enviadas pelo celular. */
export async function ensureZapiPhoneMessageSync(
  supabase: ServiceClient,
  account: WhatsAppAccount,
): Promise<void> {
  if (account.provider !== "zapi") return;

  const creds = account.credentials as ZapiCreds;
  const syncedAt = creds.webhooks_synced_at ? Date.parse(creds.webhooks_synced_at) : 0;
  const stale = !syncedAt || Date.now() - syncedAt > SYNC_INTERVAL_MS;
  if (!stale && creds.receive_callback_sent_by_me === true && creds.owner_whatsapp_lid) return;

  const webhookUrl = `${webhookBaseUrl()}/api/webhooks/whatsapp/zapi`;

  try {
    const zapi = new ZapiProvider(account);
    await zapi.configureWebhooks(webhookUrl);
    const me = await zapi.getInstanceMe();

    const ownerLid = (await syncOwnerLidFromZapiChats(account)) ?? creds.owner_whatsapp_lid ?? null;

    await supabase
      .from("whatsapp_accounts")
      .update({
        credentials: {
          ...creds,
          notify_sent_by_me_enabled: true,
          receive_callback_sent_by_me: me.receiveCallbackSentByMe === true,
          webhooks_synced_at: new Date().toISOString(),
          zapi_received_callback_url: me.receivedCallbackUrl ?? null,
          owner_whatsapp_lid: ownerLid,
        },
      })
      .eq("id", account.id);

    await syncLeadLidsFromZapiChats(supabase, account);
  } catch (err) {
    console.error("[zapi] sync webhooks:", err);
  }
}
