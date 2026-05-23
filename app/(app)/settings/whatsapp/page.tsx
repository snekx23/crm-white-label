import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppBaseUrl } from "@/lib/app-url";
import { WhatsAppForm } from "./whatsapp-form";

export default async function WhatsAppSettingsPage() {
  const ctx = await requireContext();
  const supabase = await createClient();

  const { data: accounts } = await supabase
    .from("whatsapp_accounts")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  const account = accounts?.[0] ?? null;
  const webhookBase = await getAppBaseUrl();

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Integracao WhatsApp</CardTitle>
          <CardDescription>
            Configure o provider que sua empresa vai usar para envio e recebimento de mensagens.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <WhatsAppForm initial={account} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Webhooks</CardTitle>
          <CardDescription>URLs para configurar no painel do provider</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-xs">
          <CodeRow label="Cloud API (Meta)" url={`${webhookBase}/api/webhooks/whatsapp/cloud_api`} />
          <CodeRow label="Evolution API" url={`${webhookBase}/api/webhooks/whatsapp/evolution`} />
          <CodeRow label="Z-API" url={`${webhookBase}/api/webhooks/whatsapp/zapi`} />
          <p className="border-t border-border/50 pt-3 text-muted-foreground">
            O <code className="rounded bg-muted px-1 py-0.5">verify_token</code> do Cloud API deve corresponder a variavel de ambiente
            <code className="mx-1 rounded bg-muted px-1">WHATSAPP_WEBHOOK_VERIFY_TOKEN</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function CodeRow({ label, url }: { label: string; url: string }) {
  return (
    <div>
      <div className="mb-1.5 font-medium">{label}</div>
      <code className="block break-all rounded-md bg-muted px-2.5 py-1.5 font-mono text-[11px]">{url}</code>
    </div>
  );
}
