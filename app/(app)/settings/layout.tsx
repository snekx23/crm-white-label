import { PageHeader } from "@/components/app/page-header";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <PageHeader
        eyebrow="Sistema"
        title="Configuracoes"
        description="Personalize a identidade da sua empresa no CRM"
      />
      <div className="p-8">{children}</div>
    </div>
  );
}
