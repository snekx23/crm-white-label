import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { PageHeader } from "@/components/app/page-header";
import { listQuickMessages } from "@/app/(app)/settings/quick-messages-actions";
import { DisparoForm } from "./disparo-form";
import { listCampaigns } from "./actions";

export default async function DisparosPage() {
  const ctx = await requireContext();
  const supabase = await createClient();

  const [{ data: stages }, { data: account }, { data: templates }, quickMessages, campaigns] =
    await Promise.all([
      supabase
        .from("pipeline_stages")
        .select("id, name")
        .eq("tenant_id", ctx.tenantId)
        .order("position"),
      supabase
        .from("whatsapp_accounts")
        .select("id, provider, is_active")
        .eq("tenant_id", ctx.tenantId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle(),
      supabase
        .from("message_templates")
        .select("id, name, payload, created_at")
        .eq("tenant_id", ctx.tenantId)
        .eq("channel", "whatsapp")
        .order("created_at", { ascending: false }),
      listQuickMessages(),
      listCampaigns(),
    ]);

  return (
    <div>
      <PageHeader
        eyebrow="WhatsApp"
        title="Campanhas e disparos"
        description="Segmente leads, personalize mensagens com variáveis, acompanhe o histórico e envie com intervalo seguro."
      />
      <DisparoForm
        stages={stages ?? []}
        templates={(templates ?? []).map((t) => ({
          id: t.id,
          name: t.name,
          body: typeof t.payload?.body === "string" ? t.payload.body : "",
        }))}
        quickMessages={quickMessages}
        campaigns={campaigns}
        whatsappReady={!!account}
        provider={account?.provider ?? null}
      />
    </div>
  );
}
