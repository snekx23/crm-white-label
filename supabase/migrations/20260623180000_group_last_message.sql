-- Desnormaliza a última mensagem no grupo (evita varrer milhares de logs no list)
alter table public.whatsapp_groups
  add column if not exists last_message_body text,
  add column if not exists last_message_direction text,
  add column if not exists last_message_at timestamptz;

-- Índice para a thread de um grupo específico
create index if not exists wwl_group_msg_idx
  on public.whatsapp_webhook_logs (tenant_id, contact_lid, created_at desc)
  where event_type = 'GROUP_MESSAGE';

-- Índice para o list de grupos por atividade
create index if not exists wg_last_msg_idx
  on public.whatsapp_groups (tenant_id, last_message_at desc nulls last);

-- Backfill: última mensagem de cada grupo a partir dos logs existentes
update public.whatsapp_groups g set
  last_message_body = sub.body,
  last_message_direction = sub.direction,
  last_message_at = sub.message_at
from (
  select distinct on (contact_lid)
    contact_lid,
    payload->>'body' as body,
    payload->>'direction' as direction,
    coalesce(nullif(payload->>'message_at','')::timestamptz, created_at) as message_at
  from public.whatsapp_webhook_logs
  where event_type = 'GROUP_MESSAGE'
  order by contact_lid, created_at desc
) sub
where g.provider_group_id = sub.contact_lid;
