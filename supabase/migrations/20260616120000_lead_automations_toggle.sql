-- Permite desligar automações por lead (atendimento humano assume)
alter table public.leads
  add column if not exists automations_enabled boolean not null default true;
