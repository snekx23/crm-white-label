import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";

export default function InstagramIntegrationPage() {
  return (
    <div>
      <PageHeader eyebrow="Integracao" title="Instagram DM" backHref="/integrations" description="Capture leads vindos do Instagram automaticamente." />
      <div className="grid gap-6 p-8 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Como conectar (em breve)</CardTitle>
            <CardDescription>Configuracao oficial via Meta Graph API exige uma conta Business.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <ol className="list-inside list-decimal space-y-2">
              <li>Conecte sua conta do Instagram a uma pagina do Facebook (Business).</li>
              <li>Crie um App em <a className="text-brand underline" href="https://developers.facebook.com" target="_blank">developers.facebook.com</a> com produto <em>Messenger</em>.</li>
              <li>Habilite as permissoes <code>instagram_manage_messages</code> e <code>pages_messaging</code>.</li>
              <li>Configure webhook para o endpoint que sera publicado em breve aqui.</li>
            </ol>
            <p className="mt-4 rounded-md border border-brand/30 bg-brand/5 p-3 text-xs text-foreground">
              <strong>Solucao imediata:</strong> use ferramentas como Manychat, ChatGuru ou n8n e direcione para o Webhook de captura.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
