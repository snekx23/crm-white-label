-- Evita leads duplicados com o mesmo telefone no tenant (condição de corrida no webhook).
create unique index if not exists leads_tenant_phone_unique
  on public.leads (tenant_id, phone)
  where phone is not null;
