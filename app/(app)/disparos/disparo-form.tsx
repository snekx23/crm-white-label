"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import {
  Clock3,
  Loader2,
  MessageSquare,
  Plus,
  Save,
  Send,
  Trash2,
  Users,
  Zap,
  Eye,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CampaignHistory } from "@/components/disparos/campaign-history";
import { DISPARO_CAMPAIGN_PRESETS } from "@/lib/disparos/campaign-presets";
import { renderMessageTemplate, templateVariablesHelp } from "@/lib/disparos/template";
import type { QuickMessage } from "@/lib/supabase/database.types";
import type { CampaignListItem } from "./actions";
import {
  createMessageTemplate,
  deleteMessageTemplate,
  previewDisparoAudience,
  sendBulkMessages,
  type AudiencePreview,
  type BulkSendResult,
  type MessageTemplateItem,
} from "./actions";

const DEFAULT_BODY =
  "Olá {{first_name}}, tudo bem? Vi seu contato aqui e queria retomar nossa conversa.";

type Tab = "nova" | "historico";

export function DisparoForm({
  stages,
  templates: initialTemplates,
  quickMessages,
  campaigns: initialCampaigns,
  whatsappReady,
  provider,
}: {
  stages: { id: string; name: string }[];
  templates: MessageTemplateItem[];
  quickMessages: QuickMessage[];
  campaigns: CampaignListItem[];
  whatsappReady: boolean;
  provider: string | null;
}) {
  const [tab, setTab] = useState<Tab>("nova");
  const [pending, start] = useTransition();
  const [previewPending, startPreview] = useTransition();
  const [templatePending, startTemplate] = useTransition();
  const [templates, setTemplates] = useState(initialTemplates);
  const [campaigns, setCampaigns] = useState(initialCampaigns);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("custom");
  const [templateName, setTemplateName] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [body, setBody] = useState(initialTemplates[0]?.body ?? DEFAULT_BODY);
  const [stageIds, setStageIds] = useState<string[]>([]);
  const [sourceFilters, setSourceFilters] = useState<string[]>([]);
  const [delaySeconds, setDelaySeconds] = useState(3);
  const [maxPerRun, setMaxPerRun] = useState(25);
  const [audience, setAudience] = useState<AudiencePreview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<BulkSendResult | null>(null);
  const [sendProgress, setSendProgress] = useState<number | null>(null);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId),
    [selectedTemplateId, templates],
  );

  const previewLead = audience?.sample[0] ?? {
    name: "Maria Silva",
    phone: "5511999999999",
    source: "Instagram",
  };

  const renderedPreview = useMemo(
    () =>
      renderMessageTemplate(body, {
        name: previewLead.name,
        phone: previewLead.phone,
        source: previewLead.source,
      }),
    [body, previewLead],
  );

  const estimatedSeconds = Math.max(0, (Math.min(maxPerRun, audience?.withPhone ?? 0) - 1) * delaySeconds);

  const refreshAudience = useCallback(() => {
    startPreview(async () => {
      try {
        const data = await previewDisparoAudience({
          stage_ids: stageIds,
          sources: sourceFilters,
        });
        setAudience(data);
      } catch {
        setAudience(null);
      }
    });
  }, [stageIds, sourceFilters]);

  useEffect(() => {
    const t = setTimeout(refreshAudience, 400);
    return () => clearTimeout(t);
  }, [refreshAudience]);

  function toggleStage(id: string) {
    setStageIds((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleSource(src: string) {
    setSourceFilters((s) => (s.includes(src) ? s.filter((x) => x !== src) : [...s, src]));
  }

  function selectTemplate(id: string) {
    setSelectedTemplateId(id);
    const template = templates.find((item) => item.id === id);
    if (template) setBody(template.body);
  }

  function insertVariable(key: string) {
    setBody((b) => (b.trim() ? `${b} ${key}` : key));
    setSelectedTemplateId("custom");
  }

  function onSaveTemplate() {
    setErr(null);
    startTemplate(async () => {
      try {
        const created = await createMessageTemplate({
          name: templateName || `Template ${templates.length + 1}`,
          body,
        });
        setTemplates((c) => [created, ...c]);
        setTemplateName("");
        setSelectedTemplateId(created.id);
      } catch (x) {
        setErr((x as Error).message);
      }
    });
  }

  function onDeleteTemplate(id: string) {
    startTemplate(async () => {
      try {
        await deleteMessageTemplate(id);
        setTemplates((c) => c.filter((item) => item.id !== id));
        if (selectedTemplateId === id) setSelectedTemplateId("custom");
      } catch (x) {
        setErr((x as Error).message);
      }
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setResult(null);
    if (!whatsappReady) {
      setErr("Configure o WhatsApp antes de disparar.");
      return;
    }
    if (!audience?.withPhone) {
      setErr("Nenhum lead elegível com telefone para este filtro.");
      return;
    }

    const delayMs = Math.max(0, Math.min(10, delaySeconds)) * 1000;
    const total = Math.min(maxPerRun, audience.withPhone);
    setSendProgress(0);

    start(async () => {
      try {
        const r = await sendBulkMessages({
          campaign_name: campaignName || undefined,
          stage_ids: stageIds,
          sources: sourceFilters,
          body,
          template_id: selectedTemplate?.id ?? null,
          delay_ms: delayMs,
          max_per_run: maxPerRun,
        });
        setSendProgress(100);
        setResult(r);
        setTab("historico");
        const { listCampaigns } = await import("./actions");
        const updated = await listCampaigns();
        setCampaigns(updated);
      } catch (x) {
        setErr((x as Error).message);
        setSendProgress(null);
      }
    });

    const tick = setInterval(() => {
      setSendProgress((p) => {
        if (p === null || p >= 95) return p;
        const step = Math.ceil(90 / Math.max(total, 1));
        return Math.min(95, (p ?? 0) + step);
      });
    }, delayMs || 300);
    setTimeout(() => clearInterval(tick), (delayMs + 500) * total + 5000);
  }

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex gap-2 rounded-xl border border-border/60 bg-muted/30 p-1">
        <TabButton active={tab === "nova"} onClick={() => setTab("nova")}>
          <Send className="h-4 w-4" />
          Nova campanha
        </TabButton>
        <TabButton active={tab === "historico"} onClick={() => setTab("historico")}>
          <MessageSquare className="h-4 w-4" />
          Histórico ({campaigns.length})
        </TabButton>
      </div>

      {tab === "historico" ? (
        <CampaignHistory campaigns={campaigns} />
      ) : (
        <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-6">
            {!whatsappReady && (
              <Alert variant="warning">
                Nenhuma conta WhatsApp ativa. Configure em{" "}
                <a href="/integrations/whatsapp" className="font-semibold underline">
                  Integrações → WhatsApp
                </a>
                .
              </Alert>
            )}

            {provider === "cloud_api" && (
              <Alert variant="warning">
                A Cloud API da Meta bloqueia texto livre fora da janela de 24h. Para disparo em massa, use
                Evolution/Z-API ou templates oficiais aprovados.
              </Alert>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-brand" />
                  Audiência
                </CardTitle>
                <CardDescription>
                  Filtre por estágio e origem. A contagem atualiza em tempo real.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Metric label="Leads no filtro" value={audience?.total ?? "—"} loading={previewPending} />
                  <Metric
                    label="Com telefone válido"
                    value={audience?.withPhone ?? "—"}
                    highlight
                    loading={previewPending}
                  />
                  <Metric
                    label="Neste envio (máx.)"
                    value={Math.min(maxPerRun, audience?.withPhone ?? 0)}
                    loading={previewPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Estágios do pipeline</Label>
                  {stages.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum estágio cadastrado.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {stages.map((s) => {
                        const on = stageIds.includes(s.id);
                        return (
                          <FilterChip key={s.id} active={on} onClick={() => toggleStage(s.id)}>
                            {s.name}
                          </FilterChip>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Vazio = todos os estágios com telefone.
                  </p>
                </div>

                {audience && audience.sources.length > 0 && (
                  <div className="space-y-2">
                    <Label>Origem do lead</Label>
                    <div className="flex flex-wrap gap-2">
                      {audience.sources.map((src) => (
                        <FilterChip
                          key={src}
                          active={sourceFilters.includes(src)}
                          onClick={() => toggleSource(src)}
                        >
                          {src}
                        </FilterChip>
                      ))}
                    </div>
                  </div>
                )}

                {audience && audience.sample.length > 0 && (
                  <div className="rounded-lg border border-border/50 bg-muted/20 p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Amostra da audiência
                    </p>
                    <ul className="space-y-1 text-sm">
                      {audience.sample.map((l) => (
                        <li key={l.id} className="flex justify-between gap-2">
                          <span className="truncate font-medium">{l.name}</span>
                          <span className="shrink-0 text-muted-foreground">{l.phone}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <CardTitle>Mensagem</CardTitle>
                    <CardDescription>
                      Personalize com variáveis. Importe modelos prontos ou mensagens rápidas.
                    </CardDescription>
                  </div>
                  <Badge variant="brand">{selectedTemplate ? "Template salvo" : "Texto livre"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="campaign-name">Nome da campanha</Label>
                  <Input
                    id="campaign-name"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    placeholder="Ex.: Reativação março 2026"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Modelos prontos</Label>
                  <div className="flex flex-wrap gap-2">
                    {DISPARO_CAMPAIGN_PRESETS.map((p) => (
                      <Button
                        key={p.id}
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setBody(p.body);
                          setSelectedTemplateId("custom");
                          if (!campaignName) setCampaignName(p.name);
                        }}
                      >
                        {p.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {quickMessages.length > 0 && (
                  <div className="space-y-2">
                    <Label className="inline-flex items-center gap-2">
                      <Zap className="h-4 w-4 text-brand" />
                      Mensagens rápidas da empresa
                    </Label>
                    <select
                      className="flex h-10 w-full rounded-lg border border-input/80 bg-background/50 px-3 text-sm"
                      defaultValue=""
                      onChange={(e) => {
                        const qm = quickMessages.find((m) => m.id === e.target.value);
                        if (qm) {
                          setBody(qm.body);
                          setSelectedTemplateId("custom");
                        }
                        e.target.value = "";
                      }}
                    >
                      <option value="">Inserir mensagem rápida…</option>
                      {quickMessages.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5">
                  {templateVariablesHelp().map((v) => (
                    <button
                      key={v.key}
                      type="button"
                      onClick={() => insertVariable(v.key)}
                      className="rounded-md border border-border/70 bg-muted/40 px-2 py-1 text-xs font-medium hover:border-brand/40"
                    >
                      {v.key}
                    </button>
                  ))}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="template">Template salvo</Label>
                  <select
                    id="template"
                    value={selectedTemplateId}
                    onChange={(e) => selectTemplate(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input/80 bg-background/50 px-3 text-sm"
                  >
                    <option value="custom">Texto livre</option>
                    {templates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="body">Texto do disparo</Label>
                  <Textarea
                    id="body"
                    value={body}
                    onChange={(e) => {
                      setBody(e.target.value);
                      setSelectedTemplateId("custom");
                    }}
                    rows={7}
                    required
                    placeholder="Olá {{first_name}}, …"
                  />
                </div>

                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Salvar como template</Label>
                    <Input
                      id="template-name"
                      value={templateName}
                      onChange={(e) => setTemplateName(e.target.value)}
                      placeholder="Ex.: Reativação de lead frio"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onSaveTemplate}
                      disabled={templatePending || !body.trim()}
                    >
                      {templatePending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Salvar template
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {err && <Alert variant="destructive">{err}</Alert>}

            {result && (
              <Card className="border-brand/40 bg-brand/5">
                <CardHeader>
                  <CardTitle>Campanha concluída</CardTitle>
                  <CardDescription>
                    {result.sent} enviados · {result.failed} falhas · {result.skipped} ignorados ·{" "}
                    {result.processed} processados de {result.total} elegíveis.
                  </CardDescription>
                </CardHeader>
                {result.errors.length > 0 && (
                  <CardContent>
                    <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
                      {result.errors.map((line) => (
                        <li key={line}>{line}</li>
                      ))}
                    </ul>
                  </CardContent>
                )}
              </Card>
            )}
          </div>

          <aside className="space-y-6">
            <Card className="overflow-hidden border-brand/20">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="h-4 w-4 text-brand" />
                  Prévia no WhatsApp
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-2xl bg-[#0b141a] p-4">
                  <div className="ml-auto max-w-[92%] rounded-2xl rounded-tr-sm bg-[#005c4b] px-3 py-2 text-sm leading-relaxed text-[#e9edef]">
                    {renderedPreview || (
                      <span className="text-[#8696a0]">Digite a mensagem…</span>
                    )}
                  </div>
                  <p className="mt-2 text-right text-[10px] text-[#8696a0]">
                    Para: {previewLead.name}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="xl:sticky xl:top-20">
              <CardHeader>
                <CardTitle>Envio</CardTitle>
                <CardDescription>
                  Intervalo entre mensagens reduz risco de bloqueio. Tempo estimado: ~
                  {estimatedSeconds}s neste lote.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="delay" className="inline-flex items-center gap-2">
                    <Clock3 className="h-4 w-4 text-brand" />
                    Intervalo entre envios
                  </Label>
                  <div className="grid grid-cols-[1fr_auto] items-center gap-3">
                    <input
                      id="delay"
                      type="range"
                      min={0}
                      max={10}
                      value={delaySeconds}
                      onChange={(e) => setDelaySeconds(Number(e.target.value))}
                      className="accent-brand"
                    />
                    <span className="w-14 rounded-md border border-border/70 px-2 py-1 text-center text-sm font-semibold">
                      {delaySeconds}s
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max">Máximo por envio</Label>
                  <Input
                    id="max"
                    type="number"
                    min={1}
                    max={50}
                    value={maxPerRun}
                    onChange={(e) => setMaxPerRun(Number(e.target.value))}
                  />
                </div>

                {sendProgress !== null && pending && (
                  <div className="space-y-1">
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full bg-brand transition-all duration-300"
                        style={{ width: `${sendProgress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">Enviando campanha… {sendProgress}%</p>
                  </div>
                )}

                <Button type="submit" variant="brand" className="w-full" disabled={pending || !whatsappReady}>
                  {pending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Enviando…
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Disparar campanha
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Templates salvos</CardTitle>
                <CardDescription>{templates.length} modelos reutilizáveis.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {templates.length === 0 && (
                  <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                    <Plus className="mb-2 h-4 w-4 text-brand" />
                    Salve sua primeira mensagem para reutilizar.
                  </p>
                )}
                {templates.map((template) => (
                  <div key={template.id} className="rounded-lg border border-border/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => selectTemplate(template.id)}
                        className="min-w-0 text-left"
                      >
                        <p className="truncate text-sm font-semibold">{template.name}</p>
                        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.body}</p>
                      </button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => onDeleteTemplate(template.id)}
                        disabled={templatePending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </aside>
        </form>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "flex flex-1 items-center justify-center gap-2 rounded-lg bg-card px-4 py-2.5 text-sm font-semibold shadow-sm"
          : "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground"
      }
    >
      {children}
    </button>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        active
          ? "rounded-md border border-brand bg-brand/10 px-3 py-1.5 text-sm font-semibold text-brand"
          : "rounded-md border border-border/70 px-3 py-1.5 text-sm text-muted-foreground hover:border-brand/40"
      }
    >
      {children}
    </button>
  );
}

function Metric({
  label,
  value,
  highlight,
  loading,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-xl border border-brand/30 bg-brand/5 p-3"
          : "rounded-xl border border-border/60 bg-background/40 p-3"
      }
    >
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold tabular-nums">
        {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : value}
      </p>
    </div>
  );
}

function Alert({
  variant,
  children,
}: {
  variant: "warning" | "destructive";
  children: React.ReactNode;
}) {
  const cls =
    variant === "destructive"
      ? "border-destructive/30 bg-destructive/10 text-destructive"
      : "border-warning/30 bg-warning/10 text-warning";
  return <div className={`rounded-lg border px-4 py-3 text-sm leading-6 ${cls}`}>{children}</div>;
}
