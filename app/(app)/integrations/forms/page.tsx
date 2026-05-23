import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";
import { getAppBaseUrl } from "@/lib/app-url";
import { IntakeKeysManager } from "./manager";

export default async function FormsPage() {
  const ctx = await requireContext();
  const supabase = await createClient();
  const { data: keys } = await supabase
    .from("lead_intake_keys")
    .select("*")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: false });

  const base = await getAppBaseUrl();
  const endpoint = `${base}/api/intake/lead`;

  return (
    <div>
      <PageHeader
        eyebrow="Captura"
        title="Formularios e Webhook"
        description="Crie chaves de API para receber leads do seu site, Zapier, n8n, Make ou qualquer outro lugar."
        backHref="/integrations"
      />
      <div className="space-y-6 p-8">
        <Card>
          <CardHeader>
            <CardTitle>Endpoint de captura</CardTitle>
            <CardDescription>
              Envie um POST com header <code className="rounded bg-muted px-1">x-api-key</code> para o endpoint abaixo.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <code className="block break-all rounded-md border border-border/70 bg-muted/40 px-3 py-2 font-mono text-xs">{`POST ${endpoint}`}</code>
            <details className="rounded-md border border-border/70 bg-muted/30 p-4 text-xs">
              <summary className="cursor-pointer font-medium">Exemplo de payload (JSON)</summary>
              <pre className="mt-3 overflow-x-auto font-mono text-[11px] leading-relaxed">
{`{
  "name": "Joao Silva",
  "email": "joao@email.com",
  "phone": "+55 11 99999-9999",
  "value": 12000,
  "notes": "Quer discovery de IA + rebranding para o time comercial",
  "source": "Site - Formulario Contato"
}`}
              </pre>
            </details>
            <details className="rounded-md border border-border/70 bg-muted/30 p-4 text-xs">
              <summary className="cursor-pointer font-medium">Snippet HTML para colar no seu site</summary>
              <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] leading-relaxed">
{`<form id="lead-form">
  <input name="name" required placeholder="Nome" />
  <input name="email" type="email" placeholder="Email" />
  <input name="phone" placeholder="Telefone" />
  <textarea name="notes" placeholder="Mensagem"></textarea>
  <button type="submit">Enviar</button>
</form>
<script>
document.getElementById('lead-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  await fetch('${endpoint}', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': 'SUA_CHAVE_AQUI' },
    body: JSON.stringify(data)
  });
  alert('Recebemos seu contato!');
});
</script>`}
              </pre>
            </details>
          </CardContent>
        </Card>

        <IntakeKeysManager keys={keys ?? []} canEdit={["owner", "admin"].includes(ctx.role)} />
      </div>
    </div>
  );
}
