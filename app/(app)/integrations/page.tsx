import Link from "next/link";
import {
  MessageCircle,
  Instagram,
  Facebook,
  Globe,
  Webhook,
  ChevronRight,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/app/page-header";

export default async function IntegrationsPage() {
  const ctx = await requireContext();
  const supabase = await createClient();

  const [{ data: wppAccount }, { data: keys }, { data: tenant }] = await Promise.all([
    supabase.from("whatsapp_accounts").select("id, is_active").eq("tenant_id", ctx.tenantId).maybeSingle(),
    supabase.from("lead_intake_keys").select("id, is_active").eq("tenant_id", ctx.tenantId),
    supabase.from("tenants").select("meta_pixel_id").eq("id", ctx.tenantId).single(),
  ]);

  const wppOn = !!(wppAccount?.is_active);
  const formsOn = (keys ?? []).some((k) => k.is_active);
  const metaOn = !!(tenant?.meta_pixel_id);

  const items = [
    {
      key: "whatsapp",
      title: "WhatsApp",
      description: "Atenda leads via Cloud API oficial da Meta, Evolution ou Z-API.",
      icon: MessageCircle,
      href: "/integrations/whatsapp",
      status: wppOn,
      tags: ["Cloud API", "Evolution", "Z-API"],
    },
    {
      key: "form",
      title: "Formularios web e Webhook",
      description: "Endpoint publico com chave de API para receber leads de qualquer site, Zapier ou n8n.",
      icon: Webhook,
      href: "/integrations/forms",
      status: formsOn,
      tags: ["REST API", "Zapier", "n8n", "Make"],
    },
    {
      key: "instagram",
      title: "Instagram DM",
      description: "Capture leads das DMs do Instagram via Meta Graph API (em breve - configuracao manual disponivel).",
      icon: Instagram,
      href: "/integrations/instagram",
      status: false,
      tags: ["Meta", "Graph API"],
      soon: true,
    },
    {
      key: "facebook",
      title: "Meta Ads & Pixel (CAPI)",
      description: "Configure o seu Pixel e API de Conversões do Meta para rastreamento inteligente de vendas e ROAS no WhatsApp.",
      icon: Facebook,
      href: "/integrations/facebook",
      status: metaOn,
      tags: ["Pixel", "Conversions API", "ROAS"],
    },
    {
      key: "site",
      title: "Site Solaire W+",
      description: "Pagina padrao de captura para incluir no seu site - copie um snippet HTML.",
      icon: Globe,
      href: "/integrations/forms",
      status: formsOn,
      tags: ["HTML embed", "JS snippet"],
    },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Captura de leads"
        title="Integracoes"
        description="Conecte canais para que leads cheguem automaticamente no seu CRM."
      />
      <div className="grid gap-4 p-8 md:grid-cols-2 xl:grid-cols-3">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <Link key={it.key} href={it.href} prefetch>
              <Card className="group h-full transition-all hover:border-brand/40 hover:shadow-elev-2">
                <CardContent className="flex h-full flex-col p-6">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand/10 text-brand">
                      <Icon className="h-5 w-5" />
                    </div>
                    {it.soon ? (
                      <Badge variant="outline">Em breve</Badge>
                    ) : it.status ? (
                      <Badge variant="success"><CheckCircle2 className="h-3 w-3" /> Conectado</Badge>
                    ) : (
                      <Badge variant="outline"><Circle className="h-3 w-3" /> Inativo</Badge>
                    )}
                  </div>
                  <h3 className="font-display text-lg font-semibold">{it.title}</h3>
                  <p className="mt-1 flex-1 text-sm text-muted-foreground">{it.description}</p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {it.tags.map((t) => (
                      <span key={t} className="rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-5 flex items-center justify-end text-xs text-muted-foreground transition-colors group-hover:text-brand">
                    Configurar <ChevronRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
