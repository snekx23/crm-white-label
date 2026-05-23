import { requireContext } from "@/lib/tenant";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { QuickMessagesPanel } from "@/components/settings/quick-messages-panel";
import { listQuickMessages } from "./quick-messages-actions";
import { TenantForm } from "./tenant-form";

export default async function SettingsPage() {
  const ctx = await requireContext();
  const quickMessages = await listQuickMessages();

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Identidade da empresa</CardTitle>
          <CardDescription>
            Logo, cores e nome exibidos no CRM — white label para cada empresa cadastrada.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TenantForm tenant={ctx.tenant} role={ctx.role} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mensagens rápidas</CardTitle>
          <CardDescription>
            Frases prontas para o time usar nas conversas do WhatsApp. Edite, crie ou adicione modelos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <QuickMessagesPanel initialMessages={quickMessages} />
        </CardContent>
      </Card>
    </div>
  );
}
