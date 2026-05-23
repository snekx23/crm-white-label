import Link from "next/link";
import { ArrowRight, KanbanSquare, MessageCircle, BarChart3, Boxes, ShieldCheck, Zap, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/app/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(70%_60%_at_50%_0%,hsl(var(--brand)/0.13),transparent_72%)]" />
        <div className="absolute inset-0 grid-pattern opacity-[0.06]" />
      </div>

      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/75 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <BrandLogo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login" prefetch>Entrar</Link>
            </Button>
            <Button asChild variant="brand" size="sm">
              <Link href="/signup" prefetch>Comecar</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="container relative grid gap-12 py-16 md:grid-cols-[0.9fr_1.1fr] md:items-center md:py-24">
          <div className="max-w-2xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-brand/25 bg-brand/10 px-3.5 py-1.5 text-xs font-semibold text-brand">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand" />
              </span>
              CRM premium para times comerciais
            </div>
            <h1 className="text-balance font-display text-5xl font-semibold tracking-normal md:text-7xl">
              SolAIre W+ CRM para operar vendas com presença de produto global.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-muted-foreground md:text-xl">
              Leads, kanban, WhatsApp, disparos e indicadores em uma operacao limpa, densa e pronta para ser apresentada a cliente grande sem pedir desculpa pela interface.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="brand" size="xl" className="group w-full sm:w-auto">
                <Link href="/signup" prefetch>
                  Abrir CRM
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="xl" className="w-full sm:w-auto">
                <Link href="/login" prefetch>Ja tenho conta</Link>
              </Button>
            </div>
          </div>

          <div className="relative">
            <div className="rounded-2xl border border-border/60 bg-foreground/5 p-2 shadow-elev-3">
              <div className="premium-panel overflow-hidden rounded-xl border border-border/60">
                <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">Pipeline</p>
                    <h2 className="mt-1 font-display text-xl font-semibold">Sala de receita</h2>
                  </div>
                  <div className="rounded-md border border-success/25 bg-success/10 px-3 py-1 text-sm font-semibold text-success">+18.4%</div>
                </div>
                <div className="grid gap-3 p-5 md:grid-cols-3">
                  {["Novo lead", "Atendimento", "Proposta"].map((stage, i) => (
                    <div key={stage} className="rounded-lg border border-border/50 bg-background/40 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-xs font-semibold text-muted-foreground">{stage}</span>
                        <span className="h-2 w-2 rounded-full bg-brand" />
                      </div>
                      <div className="space-y-2">
                        {[0, 1, 2].slice(0, i + 1).map((n) => (
                          <div key={n} className="rounded-md bg-card/80 p-3 shadow-elev-1">
                            <div className="h-2 w-20 rounded-full bg-foreground/18" />
                            <div className="mt-2 h-2 w-14 rounded-full bg-brand/50" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid border-t border-border/40 md:grid-cols-3">
                  <MiniStat label="Leads ativos" value="248" />
                  <MiniStat label="Conversao" value="31.6%" />
                  <MiniStat label="Receita prevista" value="R$ 482k" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="container py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand">Operacao completa</p>
            <h2 className="mt-2 text-balance font-display text-3xl font-semibold tracking-normal md:text-5xl">
              O CRM deixa de parecer ferramenta interna e passa a parecer ativo da empresa.
            </h2>
          </div>

          <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group premium-panel relative overflow-hidden rounded-lg border border-border/60 p-6 transition-all duration-500 ease-premium hover:-translate-y-1 hover:border-brand/40 hover:shadow-elev-2"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-md bg-brand/10 text-brand transition-colors duration-500 group-hover:bg-brand group-hover:text-brand-foreground">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="container py-24 text-center">
          <h2 className="font-display text-3xl font-semibold tracking-normal md:text-5xl">
            Abra o CRM e veja o produto respirando.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Cadastre uma conta, entre no dashboard e comece a testar o funil completo.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild variant="brand" size="xl">
              <Link href="/signup" prefetch>Criar conta gratis <ArrowRight className="h-4 w-4" /></Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 md:flex-row">
          <div className="flex items-center gap-3">
            <BrandLogo size="sm" />
            <span className="text-xs text-muted-foreground">
              © 2026 SolAIre W+ · CRM premium para operacoes comerciais
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

const features = [
  { icon: KanbanSquare, title: "Pipeline vivo", description: "Etapas claras, drag-and-drop e leitura rapida do que precisa de atencao agora." },
  { icon: MessageCircle, title: "WhatsApp no centro", description: "Conversa, historico e resposta sem tirar o vendedor do contexto comercial." },
  { icon: BarChart3, title: "Dashboard executivo", description: "Volume, conversao e valor em pipeline em uma linguagem que diretoria entende." },
  { icon: Boxes, title: "Catalogo operacional", description: "Controle pacotes, licencas, produtos ou entregaveis vinculados ao funil." },
  { icon: ShieldCheck, title: "Multi-tenant serio", description: "Cada empresa trabalha isolada por RLS, com identidade e configuracoes proprias." },
  { icon: Zap, title: "Integracoes diretas", description: "Webhooks, formularios e provedores de WhatsApp entram no mesmo fluxo de leads." },
];

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 border-border/40 px-5 py-4 md:border-r last:md:border-r-0">
      <div className="grid h-9 w-9 place-items-center rounded-md bg-aqua/10 text-aqua">
        <TrendingUp className="h-4 w-4" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-lg font-semibold">{value}</p>
      </div>
    </div>
  );
}
