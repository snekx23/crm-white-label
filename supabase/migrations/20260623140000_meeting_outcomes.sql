-- Funil de reuniões de vendas + lembretes
alter table public.appointments
  add column if not exists outcome text
    check (outcome in ('pending','no_show','done','closed_on_call','closed_later'))
    default 'pending',
  add column if not exists closed_at timestamptz,
  add column if not exists deal_value_cents bigint not null default 0,
  add column if not exists cost_cents bigint not null default 0,
  add column if not exists reminders_sent jsonb not null default '[]'::jsonb;

create index if not exists appointments_outcome_idx on public.appointments (tenant_id, outcome);
create index if not exists appointments_starts_idx on public.appointments (tenant_id, starts_at);

-- Backfill: agendamentos já concluídos viram "feita"
update public.appointments set outcome = 'done'
  where status = 'completed' and (outcome is null or outcome = 'pending');
update public.appointments set outcome = 'no_show'
  where status = 'no_show' and (outcome is null or outcome = 'pending');
