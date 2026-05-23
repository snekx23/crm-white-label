"use client";

import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock, AlertCircle, Ban } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CampaignListItem } from "@/app/(app)/disparos/actions";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, { label: string; variant: "default" | "brand" | "destructive" | "secondary" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  scheduled: { label: "Agendada", variant: "secondary" },
  running: { label: "Em envio", variant: "brand" },
  completed: { label: "Concluída", variant: "brand" },
  cancelled: { label: "Cancelada", variant: "secondary" },
  failed: { label: "Falhou", variant: "destructive" },
};

export function CampaignHistory({ campaigns }: { campaigns: CampaignListItem[] }) {
  if (campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Histórico de campanhas</CardTitle>
          <CardDescription>Seus disparos aparecerão aqui com totais de envio e falhas.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Nenhuma campanha registrada ainda. Faça o primeiro disparo na aba ao lado.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de campanhas</CardTitle>
        <CardDescription>Últimos disparos com status e métricas por lote.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {campaigns.map((c) => {
          const st = STATUS_LABEL[c.status] ?? STATUS_LABEL.draft;
          const stats = c.stats;
          return (
            <div
              key={c.id}
              className="rounded-xl border border-border/60 bg-background/40 p-4 transition-colors hover:border-brand/30"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                    {c.body_text && (
                      <span className="ml-2 line-clamp-1 inline max-w-[280px] align-bottom">
                        · {c.body_text.slice(0, 80)}
                        {c.body_text.length > 80 ? "…" : ""}
                      </span>
                    )}
                  </p>
                </div>
                <Badge variant={st.variant}>{st.label}</Badge>
              </div>
              {stats && (
                <div className="mt-3 flex flex-wrap gap-4 text-xs">
                  <Stat icon={CheckCircle2} label="Enviados" value={stats.sent} className="text-success" />
                  <Stat icon={AlertCircle} label="Falhas" value={stats.failed} className="text-destructive" />
                  <Stat icon={Ban} label="Ignorados" value={stats.skipped} />
                  <Stat icon={Clock} label="Pendentes" value={stats.pending} />
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-medium text-muted-foreground", className)}>
      <Icon className="h-3.5 w-3.5" />
      {label}: <strong className="text-foreground">{value}</strong>
    </span>
  );
}
