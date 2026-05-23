import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/page-header";

export default function FacebookIntegrationPage() {
  return (
    <div>
      <PageHeader eyebrow="Integracao" title="Facebook Lead Ads" backHref="/integrations" description="Receba leads de campanhas Lead Ads automaticamente." />
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Em breve</CardTitle>
            <CardDescription>
              Estamos finalizando a aprovacao do app na Meta. Enquanto isso, voce pode usar Zapier ou n8n
              para encaminhar Lead Ads para o Webhook de captura na aba Formularios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Em ambos casos, mapeie os campos <code>name</code>, <code>email</code> e <code>phone</code>.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
