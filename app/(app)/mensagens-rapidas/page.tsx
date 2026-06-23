import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { QuickMessagesPanel } from "@/components/settings/quick-messages-panel";
import { listQuickMessages } from "../settings/quick-messages-actions";

export default async function MensagensRapidasPage() {
  const quickMessages = await listQuickMessages();

  return (
    <div>
      <PageHeader
        eyebrow="Atendimento"
        title="Mensagens rápidas"
        description="Frases prontas para o time usar nas conversas do WhatsApp. Crie, edite e reordene arrastando pela alça."
      />
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <QuickMessagesPanel initialMessages={quickMessages} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
