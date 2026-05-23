-- Vendedores tambem podem criar/editar/excluir mensagens rapidas da empresa
drop policy if exists "quick_messages_insert" on public.quick_messages;
create policy "quick_messages_insert" on public.quick_messages
  for insert with check (public.is_tenant_member(tenant_id));

drop policy if exists "quick_messages_update" on public.quick_messages;
create policy "quick_messages_update" on public.quick_messages
  for update using (public.is_tenant_member(tenant_id))
  with check (public.is_tenant_member(tenant_id));

drop policy if exists "quick_messages_delete" on public.quick_messages;
create policy "quick_messages_delete" on public.quick_messages
  for delete using (public.is_tenant_member(tenant_id));
