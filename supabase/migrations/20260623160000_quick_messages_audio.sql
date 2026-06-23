-- Mensagens rápidas de áudio (e outras mídias)
alter table public.quick_messages
  add column if not exists media_url text,
  add column if not exists media_type text;

-- body deixa de ser obrigatório (áudio pode não ter texto)
alter table public.quick_messages alter column body drop not null;
