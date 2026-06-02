-- Adicionar configurações do Meta Ads por empresa (Tenant) no CRM
alter table public.tenants add column if not exists meta_pixel_id text;
alter table public.tenants add column if not exists meta_capi_token text;
alter table public.tenants add column if not exists meta_ad_account_id text;
