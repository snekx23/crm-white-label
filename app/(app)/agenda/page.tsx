import Link from "next/link";
import { CalendarDays, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock3, UserRound, X, UserX } from "lucide-react";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canManageOperationalSetup } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";
import { createProfessional, createService, transitionAppointmentStatus } from "./actions";
import { AppointmentDialog } from "./appointment-dialog";
import { MeetingOutcomeDialog } from "./meeting-outcome-dialog";

const statusLabel = { scheduled: "Agendado", confirmed: "Confirmado", completed: "Concluido", cancelled: "Cancelado", no_show: "Nao compareceu" };

function brtDay() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

function offsetDay(day: string, amount: number) {
  const date = new Date(`${day}T12:00:00-03:00`);
  date.setDate(date.getDate() + amount);
  return date.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
}

export default async function AgendaPage({ searchParams }: { searchParams?: Promise<{ day?: string }> }) {
  const ctx = await requireContext();
  const params = await searchParams;
  const day = /^\d{4}-\d{2}-\d{2}$/.test(params?.day ?? "") ? params!.day! : brtDay();
  const nextDay = offsetDay(day, 1);
  const supabase = await createClient();

  // Parse current year/month from day param
  const year = parseInt(day.slice(0, 4));
  const month = parseInt(day.slice(5, 7)) - 1; // 0-indexed
  const monthStr = String(month + 1).padStart(2, "0");

  const startOfMonth = `${year}-${monthStr}-01`;
  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonthVal = month === 11 ? 1 : month + 2;
  const nextMonthStr = String(nextMonthVal).padStart(2, "0");
  const endOfMonth = `${nextMonthYear}-${nextMonthStr}-01`;

  const [{ data: appointments }, { data: leads }, { data: professionals }, { data: services }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, starts_at, duration_minutes, status, outcome, notes, leads(id, name), professionals(name), services(name)")
      .eq("tenant_id", ctx.tenantId)
      .gte("starts_at", `${startOfMonth}T00:00:00-03:00`)
      .lt("starts_at", `${endOfMonth}T00:00:00-03:00`)
      .order("starts_at"),
    supabase.from("leads").select("id, name").eq("tenant_id", ctx.tenantId).order("name"),
    supabase.from("professionals").select("id, name").eq("tenant_id", ctx.tenantId).eq("is_active", true).order("name"),
    supabase.from("services").select("id, name, duration_minutes").eq("tenant_id", ctx.tenantId).eq("is_active", true).order("name"),
  ]);

  const canManage = canManageOperationalSetup(ctx.role);
  const isVendedor = ctx.role === "vendedor";

  // Filter current day's appointments in memory
  const dayAppointments = (appointments ?? []).filter((a) => a.starts_at.startsWith(day));

  // Calendar monthly calculations
  const firstDayIndex = new Date(`${year}-${monthStr}-01T12:00:00-03:00`).getDay(); // 0: Sun, 6: Sat
  const totalDays = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayIndex; i++) {
    cells.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    cells.push(d);
  }

  const MONTH_NAMES = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const prevMonthDate = new Date(year, month - 1, 15);
  const nextMonthDate = new Date(year, month + 1, 15);
  const prevMonthDay = prevMonthDate.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });
  const nextMonthDay = nextMonthDate.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

  const weekdayHeaders = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  return (
    <div>
      <PageHeader 
        eyebrow="Agenda" 
        title="Agenda de Shows" 
        description="Consulte datas ocupadas e disponíveis para fechar novos shows." 
        actions={!isVendedor ? <AppointmentDialog leads={leads ?? []} professionals={professionals ?? []} services={services ?? []} /> : undefined} 
      />
      
      <div className="space-y-6 p-8">
        
        {/* Month Selector header */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="lg" className="h-10 text-sm font-bold">
              <Link href={`/agenda?day=${prevMonthDay}`}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Mês Anterior
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="h-10 text-sm font-bold">
              <Link href={`/agenda?day=${nextMonthDay}`}>
                Próximo Mês <ChevronRight className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </div>
          
          <h2 className="font-display text-xl font-bold tracking-tight text-foreground">
            📅 {MONTH_NAMES[month]} de {year}
          </h2>

          <Button asChild variant="brand" size="sm" className="h-10 text-xs font-bold">
            <Link href={`/agenda?day=${brtDay()}`}>Ir para Hoje</Link>
          </Button>
        </div>

        {/* Visual Calendar Grid */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="grid grid-cols-7 gap-2.5 text-center">
            {/* Weekday headers */}
            {weekdayHeaders.map((h) => (
              <div key={h} className="text-sm font-bold text-muted-foreground uppercase tracking-wider py-2">
                {h}
              </div>
            ))}

            {/* Day cells */}
            {cells.map((d, index) => {
              if (d === null) {
                return <div key={`empty-${index}`} className="aspect-square bg-muted/10 rounded-lg" />;
              }

              const currentDayStr = String(d).padStart(2, "0");
              const dayKey = `${year}-${monthStr}-${currentDayStr}`;
              const appsOnDay = (appointments ?? []).filter(
                (a) => a.starts_at.startsWith(dayKey) && a.status !== "cancelled"
              );
              const isOcupado = appsOnDay.length > 0;
              const isSelected = day === dayKey;

              return (
                <Link
                  key={dayKey}
                  href={`/agenda?day=${dayKey}`}
                  className={`relative flex flex-col justify-between aspect-square p-2.5 rounded-xl border-2 transition-all hover:scale-105 duration-100 text-left ${
                    isSelected
                      ? "ring-4 ring-brand/50 shadow-md border-brand z-10"
                      : isOcupado
                      ? "bg-red-500/10 border-red-500/35 text-red-900 dark:text-red-400 hover:bg-red-500/20"
                      : "bg-emerald-500/10 border-emerald-500/35 text-emerald-900 dark:text-emerald-400 hover:bg-emerald-500/20"
                  }`}
                >
                  <span className="text-lg font-bold">{d}</span>
                  
                  <span className="self-end text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded-md leading-none tracking-wide"
                    style={{
                      backgroundColor: isOcupado ? "rgba(239, 68, 68, 0.2)" : "rgba(16, 185, 129, 0.2)",
                      color: isOcupado ? "rgb(239, 68, 68)" : "rgb(16, 185, 129)"
                    }}
                  >
                    {isOcupado ? "Ocupado" : "Livre"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Selected Day Shows details */}
        <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
          <h3 className="font-display text-lg font-bold tracking-tight text-foreground border-b border-border/50 pb-3 flex items-center gap-2">
            📋 Programação para {new Date(`${day}T12:00:00`).toLocaleDateString("pt-BR", { dateStyle: "long" })}
          </h3>

          {dayAppointments.length === 0 && (
            <div className="py-8 text-center text-base text-muted-foreground font-medium">
              Nenhum show ou compromisso agendado para este dia.
            </div>
          )}

          <div className="divide-y divide-border/70">
            {dayAppointments.map((appointment) => {
              const lead = appointment.leads as unknown as { id: string; name: string } | null;
              const professional = appointment.professionals as unknown as { name: string } | null;
              const service = appointment.services as unknown as { name: string } | null;
              return (
                <div key={appointment.id} className="flex flex-wrap items-center justify-between gap-4 py-4 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className="w-16 shrink-0 bg-muted/30 p-2 rounded-lg text-center">
                      <p className="font-mono text-base font-bold text-foreground">
                        {new Date(appointment.starts_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium">{appointment.duration_minutes}m</p>
                    </div>
                    <div>
                      {lead ? (
                        <Link href={`/leads/${lead.id}`} className="font-bold text-base hover:text-brand transition-colors">
                          {lead.name}
                        </Link>
                      ) : (
                        <span className="font-bold text-base text-muted-foreground">Cliente não identificado</span>
                      )}
                      <p className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><UserRound className="h-3 w-3" />{professional?.name ?? "N/A"}</span>
                        <span className="flex items-center gap-1"><Clock3 className="h-3 w-3" />{service?.name ?? "N/A"}</span>
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge variant={appointment.status === "completed" ? "success" : appointment.status === "cancelled" || appointment.status === "no_show" ? "destructive" : "outline"}>
                      {statusLabel[appointment.status as keyof typeof statusLabel]}
                    </Badge>
                    
                    {!isVendedor && (
                      <div className="flex gap-1">
                        {appointment.status === "scheduled" && <StatusButton id={appointment.id} status="confirmed" title="Confirmar"><Check className="h-4 w-4" /></StatusButton>}
                        <MeetingOutcomeDialog
                          appointmentId={appointment.id}
                          leadName={lead?.name ?? "Cliente"}
                          currentOutcome={(appointment as { outcome?: string | null }).outcome ?? null}
                        />
                        {(appointment.status === "scheduled" || appointment.status === "confirmed") && <StatusButton id={appointment.id} status="cancelled" title="Cancelar"><X className="h-4 w-4" /></StatusButton>}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {canManage && !isVendedor && (
          <div className="grid gap-6 border-t border-border/70 pt-6 md:grid-cols-2">
            <form action={createProfessional} className="space-y-3">
              <h2 className="text-base font-bold">Cadastrar profissional</h2>
              <div className="flex gap-2">
                <Input name="name" required placeholder="Nome" className="h-10" />
                <Input name="phone" placeholder="Telefone" className="h-10" />
                <Button className="h-10 font-bold">Adicionar</Button>
              </div>
            </form>
            <form action={createService} className="space-y-3">
              <h2 className="text-base font-bold">Cadastrar servico</h2>
              <div className="grid grid-cols-[1fr_90px_100px_auto] gap-2">
                <Input name="name" required placeholder="Servico" className="h-10" />
                <Input name="duration_minutes" type="number" min="15" defaultValue="60" className="h-10" />
                <Input name="price" type="number" min="0" step="0.01" placeholder="Preco" className="h-10" />
                <Button className="h-10 font-bold">Adicionar</Button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusButton({ id, status, title, children }: { id: string; status: string; title: string; children: React.ReactNode }) {
  return (
    <form action={transitionAppointmentStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <Button size="icon" variant="ghost" className="h-8 w-8" title={title}>{children}</Button>
    </form>
  );
}
