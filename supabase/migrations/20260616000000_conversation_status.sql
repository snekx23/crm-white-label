-- Status de atendimento das conversas (estilo Datacrazy)
create type public.conversation_status as enum (
  'nao_iniciada',   -- lead escreveu, ninguem respondeu ainda
  'aguardando',     -- voce respondeu, aguardando o cliente
  'em_atendimento', -- conversa ativa em andamento
  'resolvida'       -- atendimento encerrado
);

alter table public.conversations
  add column status public.conversation_status not null default 'nao_iniciada';

create index on public.conversations (tenant_id, status);

-- Backfill: deriva o status inicial a partir das mensagens existentes
update public.conversations c
set status = sub.computed
from (
  select
    conv.id,
    case
      when last_dir is null then 'nao_iniciada'::public.conversation_status
      when last_dir = 'outbound' then 'aguardando'::public.conversation_status
      when has_outbound then 'em_atendimento'::public.conversation_status
      else 'nao_iniciada'::public.conversation_status
    end as computed
  from public.conversations conv
  left join lateral (
    select direction as last_dir
    from public.messages m
    where m.conversation_id = conv.id
    order by m.created_at desc
    limit 1
  ) lm on true
  left join lateral (
    select true as has_outbound
    from public.messages m
    where m.conversation_id = conv.id and m.direction = 'outbound'
    limit 1
  ) ob on true
) sub
where c.id = sub.id;
