# Megas Perini CRM Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the production-ready operational foundation for Megas Perini by extending the existing WHITE LABEL CRM with branded tenant bootstrap, role-based access, hybrid lead distribution, configurable pipelines, technical client fields, tasks, internal scheduling, and hair-stock reservations.

**Architecture:** Keep the existing Next.js 15 App Router, Supabase Auth/Postgres/RLS/Realtime, and Cloudflare Workers deployment. Add one additive Supabase migration, small domain-focused TypeScript modules, and authenticated routes that follow the existing server-action pattern. Preserve the current dirty worktree: do not revert or overwrite unrelated WhatsApp, group-chat, Meta, or branding changes already present.

**Tech Stack:** Next.js 15, React 19, TypeScript, Supabase, PostgreSQL RLS, Tailwind CSS, shadcn-style UI components, Lucide React, Node test runner, esbuild, Cloudflare Workers.

---

## Scope Boundary

This plan implements **Delivery 1 - Operational Foundation** from the approved design.

Included:

- Megas Perini tenant bootstrap with an empty production database;
- administrator, manager, and attendant permissions;
- shared queue and hybrid lead assignment;
- configurable multiple pipelines;
- technical mega-hair profile fields;
- tasks;
- internal scheduling;
- adapted inventory and stock reservations;
- navigation and initial dashboard additions.

Not included in this plan:

- connecting a real WhatsApp number;
- Meta credential activation;
- visual automation editor;
- persistent automation runner;
- complete management reports.

Those are separate plans because they are independently testable subsystems.

## Existing Worktree Safety

Before implementation, preserve the current working tree exactly as found:

```powershell
git status --short
git diff --stat
git diff --cached --stat
```

Expected: pre-existing edits are visible in chat, disparos, Meta, tenant, WhatsApp, tests, and the approved Megas specification. Do not revert them.

The repository currently lacks Git author identity. Before creating commits, the user must configure repository-local identity:

```powershell
$gitName = Read-Host "Git author name"
$gitEmail = Read-Host "Git author email"
git config user.name $gitName
git config user.email $gitEmail
```

Do not invent these values. Until configured, run verification normally and leave changes uncommitted.

## File Map

### Database

- Create: `supabase/migrations/20260601000000_megas_perini_roles.sql`
- Create: `supabase/migrations/20260601001000_megas_perini_foundation.sql`
- Modify: `lib/supabase/database.types.ts`

### Roles and assignment

- Create: `lib/auth/roles.ts`
- Create: `lib/leads/assignment.ts`
- Create: `tests/roles.test.mjs`
- Create: `tests/lead-assignment.test.mjs`
- Modify: `lib/tenant.ts`
- Modify: `app/(app)/leads/actions.ts`

### Pipelines

- Create: `app/(app)/pipelines/page.tsx`
- Create: `app/(app)/pipelines/actions.ts`
- Create: `app/(app)/pipelines/pipeline-form.tsx`
- Modify: `app/(app)/kanban/page.tsx`
- Modify: `app/(app)/kanban/kanban-board.tsx`

### Technical profile and tasks

- Create: `lib/leads/custom-fields.ts`
- Create: `tests/custom-fields.test.mjs`
- Create: `app/(app)/leads/[id]/technical-profile-panel.tsx`
- Create: `app/(app)/leads/[id]/task-panel.tsx`
- Create: `app/(app)/leads/[id]/actions.ts`
- Modify: `app/(app)/leads/[id]/page.tsx`

### Scheduling

- Create: `lib/agenda/status.ts`
- Create: `tests/agenda-status.test.mjs`
- Create: `app/(app)/agenda/page.tsx`
- Create: `app/(app)/agenda/actions.ts`
- Create: `app/(app)/agenda/appointment-dialog.tsx`

### Inventory

- Create: `lib/estoque/reservations.ts`
- Create: `tests/stock-reservations.test.mjs`
- Create: `app/(app)/estoque/[id]/reservation-form.tsx`
- Modify: `app/(app)/estoque/actions.ts`
- Modify: `app/(app)/estoque/[id]/page.tsx`
- Modify: `app/(app)/estoque/page.tsx`

### Navigation and dashboard

- Modify: `components/app/sidebar.tsx`
- Modify: `app/(app)/dashboard/page.tsx`
- Modify: `components/dashboard/leads-ops-dashboard.tsx`
- Modify: `package.json`

## Task 1: Add a Repeatable Test Command

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Confirm the current Node tests manually**

Run:

```powershell
node --test tests/*.test.mjs
```

Expected: the existing WhatsApp group tests run before any foundation work. Record the baseline result; if an existing test fails, report it before changing production code.

- [ ] **Step 2: Add the test script**

Add this script to `package.json`:

```json
{
  "scripts": {
    "test": "node --test tests/*.test.mjs"
  }
}
```

Keep every existing script unchanged.

- [ ] **Step 3: Verify the script**

Run:

```powershell
npm test
```

Expected: same result as the manual baseline.

- [ ] **Step 4: Commit when Git identity exists**

```powershell
git add package.json
git commit -m "test: add foundation test command"
```

## Task 2: Extend the Database Foundation

**Files:**
- Create: `supabase/migrations/20260601000000_megas_perini_roles.sql`
- Create: `supabase/migrations/20260601001000_megas_perini_foundation.sql`
- Modify: `lib/supabase/database.types.ts`

- [ ] **Step 1: Add new enum values in their own migration**

Create `supabase/migrations/20260601000000_megas_perini_roles.sql`:

```sql
alter type public.member_role add value if not exists 'gerente';
alter type public.member_role add value if not exists 'atendente';
```

Keep this migration separate because PostgreSQL enum values must be committed
before later migrations reference them in RLS policies.

- [ ] **Step 2: Create the additive foundation migration**

Create `supabase/migrations/20260601001000_megas_perini_foundation.sql` with additive SQL only. Do not modify earlier migrations.

The migration must:

```sql
create table public.attendant_status (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  is_available boolean not null default true,
  last_assigned_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create table public.lead_assignment_history (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  from_user_id uuid references auth.users(id) on delete set null,
  to_user_id uuid references auth.users(id) on delete set null,
  assigned_by uuid references auth.users(id) on delete set null,
  reason text not null,
  created_at timestamptz not null default now()
);

create table public.custom_field_definitions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  entity_type text not null check (entity_type in ('lead')),
  key text not null,
  label text not null,
  field_type text not null check (field_type in ('text','number','date','select','boolean','file')),
  options jsonb not null default '[]'::jsonb,
  is_required boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (tenant_id, entity_type, key)
);

create table public.tasks (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  title text not null,
  notes text,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','done','cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.professionals (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  phone text,
  color text default '#9d7e52',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.services (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null,
  duration_minutes int not null check (duration_minutes > 0),
  price_cents bigint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.appointments (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  professional_id uuid references public.professionals(id) on delete set null,
  service_id uuid references public.services(id) on delete set null,
  starts_at timestamptz not null,
  duration_minutes int not null check (duration_minutes > 0),
  status text not null default 'scheduled'
    check (status in ('scheduled','confirmed','completed','cancelled','no_show')),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products
  add column if not exists tone text,
  add column if not exists length_cm int,
  add column if not exists texture text;

create table public.stock_reservations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  lead_id uuid references public.leads(id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete cascade,
  quantity int not null check (quantity > 0),
  status text not null default 'active' check (status in ('active','released','consumed')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
```

Add indexes for tenant filtering and dates:

```sql
create index on public.attendant_status (tenant_id, is_available, last_assigned_at);
create index on public.lead_assignment_history (tenant_id, lead_id, created_at desc);
create index on public.custom_field_definitions (tenant_id, entity_type, sort_order);
create index on public.tasks (tenant_id, status, due_at);
create index on public.appointments (tenant_id, starts_at);
create index on public.stock_reservations (tenant_id, product_id, status);
```

Add triggers:

```sql
create trigger attendant_status_touch
  before update on public.attendant_status
  for each row execute function public.touch_updated_at();

create trigger tasks_touch
  before update on public.tasks
  for each row execute function public.touch_updated_at();

create trigger appointments_touch
  before update on public.appointments
  for each row execute function public.touch_updated_at();
```

Add RLS explicitly:

```sql
alter table public.attendant_status enable row level security;
alter table public.lead_assignment_history enable row level security;
alter table public.custom_field_definitions enable row level security;
alter table public.tasks enable row level security;
alter table public.professionals enable row level security;
alter table public.services enable row level security;
alter table public.appointments enable row level security;
alter table public.stock_reservations enable row level security;

do $$
declare
  t text;
  operational_tables text[] := array[
    'attendant_status','lead_assignment_history','tasks','appointments','stock_reservations'
  ];
begin
  foreach t in array operational_tables loop
    execute format($f$
      create policy "%1$s_tenant_select" on public.%1$s
        for select using (public.is_tenant_member(tenant_id));
      create policy "%1$s_tenant_insert" on public.%1$s
        for insert with check (public.is_tenant_member(tenant_id));
      create policy "%1$s_tenant_update" on public.%1$s
        for update using (public.is_tenant_member(tenant_id))
        with check (public.is_tenant_member(tenant_id));
      create policy "%1$s_tenant_delete" on public.%1$s
        for delete using (
          public.has_tenant_role(
            tenant_id,
            array['owner','admin','gerente']::public.member_role[]
          )
        );
    $f$, t);
  end loop;
end $$;

do $$
declare
  t text;
  setup_tables text[] := array['custom_field_definitions','professionals','services'];
begin
  foreach t in array setup_tables loop
    execute format($f$
      create policy "%1$s_tenant_select" on public.%1$s
        for select using (public.is_tenant_member(tenant_id));
      create policy "%1$s_tenant_write" on public.%1$s
        for all using (
          public.has_tenant_role(
            tenant_id,
            array['owner','admin','gerente']::public.member_role[]
          )
        )
        with check (
          public.has_tenant_role(
            tenant_id,
            array['owner','admin','gerente']::public.member_role[]
          )
        );
    $f$, t);
  end loop;
end $$;

alter publication supabase_realtime add table public.appointments;
alter publication supabase_realtime add table public.tasks;
alter publication supabase_realtime add table public.attendant_status;
```

- [ ] **Step 3: Seed Megas defaults in a SQL helper function**

In the same migration, add:

```sql
create or replace function public.seed_megas_perini_defaults(target_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  pipeline_row record;
begin
  delete from public.pipelines
  where tenant_id = target_tenant_id
    and name = 'Pipeline Principal'
    and not exists (
      select 1 from public.leads where pipeline_id = public.pipelines.id
    );

  update public.pipelines set is_default = false where tenant_id = target_tenant_id;

  insert into public.pipelines (tenant_id, name, is_default)
  select target_tenant_id, seed.name, seed.is_default
  from (
    values
      ('Novas clientes', true),
      ('Aplicacoes', false),
      ('Manutencoes e retornos', false)
  ) as seed(name, is_default)
  where not exists (
    select 1 from public.pipelines
    where tenant_id = target_tenant_id and name = seed.name
  );

  update public.pipelines
  set is_default = (name = 'Novas clientes')
  where tenant_id = target_tenant_id;

  for pipeline_row in select id from public.pipelines where tenant_id = target_tenant_id loop
    if not exists (select 1 from public.pipeline_stages where pipeline_id = pipeline_row.id) then
      insert into public.pipeline_stages (tenant_id, pipeline_id, name, position, color, is_won, is_lost)
      values
        (target_tenant_id, pipeline_row.id, 'Novo lead', 0, '#9d7e52', false, false),
        (target_tenant_id, pipeline_row.id, 'Em atendimento', 1, '#7a6b58', false, false),
        (target_tenant_id, pipeline_row.id, 'Agendado', 2, '#4f6f61', false, false),
        (target_tenant_id, pipeline_row.id, 'Finalizado', 3, '#2f5d50', true, false),
        (target_tenant_id, pipeline_row.id, 'Perdido', 4, '#8b4b3a', false, true);
    end if;
  end loop;

  insert into public.custom_field_definitions
    (tenant_id, entity_type, key, label, field_type, sort_order)
  values
    (target_tenant_id, 'lead', 'metodo_aplicado', 'Metodo aplicado', 'text', 10),
    (target_tenant_id, 'lead', 'cor_tonalidade', 'Cor e tonalidade', 'text', 20),
    (target_tenant_id, 'lead', 'comprimento_cm', 'Comprimento', 'number', 30),
    (target_tenant_id, 'lead', 'textura', 'Textura', 'text', 40),
    (target_tenant_id, 'lead', 'volume', 'Volume', 'text', 50),
    (target_tenant_id, 'lead', 'data_aplicacao', 'Data da aplicacao', 'date', 60),
    (target_tenant_id, 'lead', 'proxima_manutencao', 'Proxima manutencao', 'date', 70)
  on conflict (tenant_id, entity_type, key) do nothing;
end;
$$;
```

- [ ] **Step 4: Extend TypeScript types**

Add exact interfaces to `lib/supabase/database.types.ts`:

```ts
export type MemberRole = "owner" | "admin" | "gerente" | "atendente" | "vendedor";
export type TaskStatus = "open" | "done" | "cancelled";
export type AppointmentStatus = "scheduled" | "confirmed" | "completed" | "cancelled" | "no_show";
export type StockReservationStatus = "active" | "released" | "consumed";

export interface AttendantStatus {
  tenant_id: string;
  user_id: string;
  is_available: boolean;
  last_assigned_at: string | null;
  updated_at: string;
}

export interface LeadAssignmentHistory {
  id: string;
  tenant_id: string;
  lead_id: string;
  from_user_id: string | null;
  to_user_id: string | null;
  assigned_by: string | null;
  reason: string;
  created_at: string;
}

export interface CustomFieldDefinition {
  id: string;
  tenant_id: string;
  entity_type: "lead";
  key: string;
  label: string;
  field_type: "text" | "number" | "date" | "select" | "boolean" | "file";
  options: unknown[];
  is_required: boolean;
  sort_order: number;
  created_at: string;
}

export interface Task {
  id: string;
  tenant_id: string;
  lead_id: string | null;
  assigned_to: string | null;
  created_by: string | null;
  title: string;
  notes: string | null;
  due_at: string | null;
  status: TaskStatus;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Professional {
  id: string;
  tenant_id: string;
  name: string;
  phone: string | null;
  color: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Service {
  id: string;
  tenant_id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
  is_active: boolean;
  created_at: string;
}

export interface Appointment {
  id: string;
  tenant_id: string;
  lead_id: string;
  professional_id: string | null;
  service_id: string | null;
  starts_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StockReservation {
  id: string;
  tenant_id: string;
  product_id: string;
  lead_id: string | null;
  appointment_id: string | null;
  quantity: number;
  status: StockReservationStatus;
  created_by: string | null;
  created_at: string;
}
```

Extend `Product` with `tone`, `length_cm`, and `texture`.

Add every new interface to the `Database.public.Tables` map:

```ts
attendant_status: { Row: AttendantStatus; Insert: Partial<AttendantStatus>; Update: Partial<AttendantStatus> };
lead_assignment_history: { Row: LeadAssignmentHistory; Insert: Partial<LeadAssignmentHistory>; Update: Partial<LeadAssignmentHistory> };
custom_field_definitions: { Row: CustomFieldDefinition; Insert: Partial<CustomFieldDefinition>; Update: Partial<CustomFieldDefinition> };
tasks: { Row: Task; Insert: Partial<Task>; Update: Partial<Task> };
professionals: { Row: Professional; Insert: Partial<Professional>; Update: Partial<Professional> };
services: { Row: Service; Insert: Partial<Service>; Update: Partial<Service> };
appointments: { Row: Appointment; Insert: Partial<Appointment>; Update: Partial<Appointment> };
stock_reservations: { Row: StockReservation; Insert: Partial<StockReservation>; Update: Partial<StockReservation> };
```

- [ ] **Step 5: Verify the migration locally**

Run:

```powershell
npx supabase db reset
npx supabase db lint
```

Expected: migrations apply without SQL errors and lint reports no new schema issue. If local Supabase cannot run because Docker is unavailable, record that limitation and run the SQL in a linked preview project before production.

- [ ] **Step 6: Commit when Git identity exists**

```powershell
git add supabase/migrations/20260601000000_megas_perini_roles.sql supabase/migrations/20260601001000_megas_perini_foundation.sql lib/supabase/database.types.ts
git commit -m "feat: add Megas Perini foundation schema"
```

## Task 3: Implement Role Checks

**Files:**
- Create: `lib/auth/roles.ts`
- Create: `tests/roles.test.mjs`
- Modify: `lib/tenant.ts`

- [ ] **Step 1: Write the failing role test**

Create `tests/roles.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

async function loadModule() {
  await mkdir("node_modules/.cache", { recursive: true });
  const outfile = "node_modules/.cache/roles-test.mjs";
  await build({ entryPoints: ["lib/auth/roles.ts"], bundle: true, platform: "node", format: "esm", outfile });
  return import(pathToFileURL(process.cwd() + "/" + outfile).href + `?v=${Date.now()}`);
}

test("administrator and manager can manage operational setup", async () => {
  const { canManageOperationalSetup } = await loadModule();
  assert.equal(canManageOperationalSetup("owner"), true);
  assert.equal(canManageOperationalSetup("admin"), true);
  assert.equal(canManageOperationalSetup("gerente"), true);
  assert.equal(canManageOperationalSetup("atendente"), false);
});

test("attendant can operate leads but cannot manage integrations", async () => {
  const { canOperateLead, canManageIntegrations } = await loadModule();
  assert.equal(canOperateLead("atendente"), true);
  assert.equal(canManageIntegrations("atendente"), false);
  assert.equal(canManageIntegrations("admin"), true);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test tests/roles.test.mjs
```

Expected: FAIL because `lib/auth/roles.ts` does not exist.

- [ ] **Step 3: Implement role helpers**

Create `lib/auth/roles.ts`:

```ts
import type { MemberRole } from "@/lib/supabase/database.types";

export function canManageUsers(role: MemberRole) {
  return role === "owner" || role === "admin";
}

export function canManageIntegrations(role: MemberRole) {
  return role === "owner" || role === "admin";
}

export function canManageOperationalSetup(role: MemberRole) {
  return role === "owner" || role === "admin" || role === "gerente";
}

export function canOperateLead(role: MemberRole) {
  return ["owner", "admin", "gerente", "atendente", "vendedor"].includes(role);
}

export function canSeeAllLeads(role: MemberRole) {
  return role === "owner" || role === "admin" || role === "gerente";
}
```

- [ ] **Step 4: Add an assertion helper**

Append:

```ts
export function assertRole(
  role: MemberRole,
  predicate: (role: MemberRole) => boolean,
  message = "Sem permissao",
) {
  if (!predicate(role)) throw new Error(message);
}
```

Use these helpers when later server actions need authorization. Do not leave new inline role arrays scattered across actions.

- [ ] **Step 5: Verify GREEN**

Run:

```powershell
npm test
```

Expected: role tests pass and existing tests remain green.

- [ ] **Step 6: Commit when Git identity exists**

```powershell
git add lib/auth/roles.ts tests/roles.test.mjs lib/tenant.ts
git commit -m "feat: add Megas Perini role permissions"
```

## Task 4: Add Hybrid Lead Assignment

**Files:**
- Create: `lib/leads/assignment.ts`
- Create: `tests/lead-assignment.test.mjs`
- Modify: `app/(app)/leads/actions.ts`

- [ ] **Step 1: Write the failing assignment test**

Create `tests/lead-assignment.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

async function loadModule() {
  await mkdir("node_modules/.cache", { recursive: true });
  const outfile = "node_modules/.cache/lead-assignment-test.mjs";
  await build({ entryPoints: ["lib/leads/assignment.ts"], bundle: true, platform: "node", format: "esm", outfile });
  return import(pathToFileURL(process.cwd() + "/" + outfile).href + `?v=${Date.now()}`);
}

test("chooses the available attendant least recently assigned", async () => {
  const { chooseRoundRobinAttendant } = await loadModule();
  const selected = chooseRoundRobinAttendant([
    { user_id: "newer", is_available: true, last_assigned_at: "2026-06-01T11:00:00.000Z" },
    { user_id: "never", is_available: true, last_assigned_at: null },
    { user_id: "older", is_available: true, last_assigned_at: "2026-06-01T09:00:00.000Z" },
  ]);
  assert.equal(selected?.user_id, "never");
});

test("returns null when no attendant is available", async () => {
  const { chooseRoundRobinAttendant } = await loadModule();
  assert.equal(chooseRoundRobinAttendant([{ user_id: "busy", is_available: false, last_assigned_at: null }]), null);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run:

```powershell
node --test tests/lead-assignment.test.mjs
```

Expected: FAIL because `lib/leads/assignment.ts` does not exist.

- [ ] **Step 3: Implement the pure chooser**

Create `lib/leads/assignment.ts`:

```ts
export interface AssignableAttendant {
  user_id: string;
  is_available: boolean;
  last_assigned_at: string | null;
}

export function chooseRoundRobinAttendant(rows: AssignableAttendant[]) {
  const available = rows.filter((row) => row.is_available);
  if (available.length === 0) return null;
  return [...available].sort((a, b) => {
    if (a.last_assigned_at === null) return -1;
    if (b.last_assigned_at === null) return 1;
    return a.last_assigned_at.localeCompare(b.last_assigned_at);
  })[0];
}
```

- [ ] **Step 4: Verify chooser GREEN**

Run:

```powershell
node --test tests/lead-assignment.test.mjs
```

Expected: PASS.

- [ ] **Step 5: Add assignment server actions**

In `app/(app)/leads/actions.ts`, add:

```ts
export async function assignLead(input: {
  leadId: string;
  toUserId: string | null;
  reason: "round_robin" | "manual_assign" | "transfer" | "return_to_queue";
}) {
  const ctx = await requireContext();
  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("leads")
    .select("assigned_to")
    .eq("id", input.leadId)
    .eq("tenant_id", ctx.tenantId)
    .single();
  if (!lead) throw new Error("Lead nao encontrado");

  const { error } = await supabase
    .from("leads")
    .update({ assigned_to: input.toUserId })
    .eq("id", input.leadId)
    .eq("tenant_id", ctx.tenantId);
  if (error) throw new Error(error.message);

  await supabase.from("lead_assignment_history").insert({
    tenant_id: ctx.tenantId,
    lead_id: input.leadId,
    from_user_id: lead.assigned_to,
    to_user_id: input.toUserId,
    assigned_by: ctx.userId,
    reason: input.reason,
  });
  revalidatePath("/leads");
  revalidatePath("/kanban");
}
```

Add `autoAssignLead(leadId)` that queries `attendant_status`, chooses with `chooseRoundRobinAttendant`, calls `assignLead`, and updates `last_assigned_at`. If no attendant is available, leave `assigned_to = null` so the lead stays in the shared queue.

Call `autoAssignLead()` after manual lead creation and CSV import. Keep failures non-destructive: log assignment errors but preserve successful lead creation.

- [ ] **Step 6: Run verification**

Run:

```powershell
npm test
npm run build
```

Expected: tests pass and Next.js build exits zero.

- [ ] **Step 7: Commit when Git identity exists**

```powershell
git add lib/leads/assignment.ts tests/lead-assignment.test.mjs 'app/(app)/leads/actions.ts'
git commit -m "feat: add hybrid lead assignment"
```

## Task 5: Add Configurable Pipeline Management

**Files:**
- Create: `app/(app)/pipelines/page.tsx`
- Create: `app/(app)/pipelines/actions.ts`
- Create: `app/(app)/pipelines/pipeline-form.tsx`
- Modify: `app/(app)/kanban/page.tsx`
- Modify: `app/(app)/kanban/kanban-board.tsx`

- [ ] **Step 1: Add pipeline actions**

Create `app/(app)/pipelines/actions.ts` with server actions:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assertRole, canManageOperationalSetup } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";

const pipelineSchema = z.object({
  name: z.string().trim().min(1, "Nome obrigatorio"),
  is_default: z.boolean().default(false),
});

export async function createPipeline(input: z.infer<typeof pipelineSchema>) {
  const ctx = await requireContext();
  assertRole(ctx.role, canManageOperationalSetup);
  const parsed = pipelineSchema.parse(input);
  const supabase = await createClient();
  if (parsed.is_default) {
    await supabase.from("pipelines").update({ is_default: false }).eq("tenant_id", ctx.tenantId);
  }
  const { error } = await supabase.from("pipelines").insert({ tenant_id: ctx.tenantId, ...parsed });
  if (error) throw new Error(error.message);
  revalidatePath("/pipelines");
  revalidatePath("/kanban");
}

export async function setDefaultPipeline(id: string) {
  const ctx = await requireContext();
  assertRole(ctx.role, canManageOperationalSetup);
  const supabase = await createClient();
  await supabase.from("pipelines").update({ is_default: false }).eq("tenant_id", ctx.tenantId);
  const { error } = await supabase.from("pipelines").update({ is_default: true }).eq("id", id).eq("tenant_id", ctx.tenantId);
  if (error) throw new Error(error.message);
  revalidatePath("/pipelines");
  revalidatePath("/kanban");
}
```

Add actions to create, update, reorder, and delete stages. Refuse deletion when leads still reference the stage.

- [ ] **Step 2: Build the pipeline management page**

Create `app/(app)/pipelines/page.tsx` and `pipeline-form.tsx` following the current `PageHeader`, `Card`, `Dialog`, `Input`, and `Button` patterns. The page must:

- list pipelines;
- mark the default;
- allow authorized roles to create a pipeline;
- show ordered stages with color swatches;
- allow create, rename, reorder, and delete;
- show an empty state without decorative filler.

- [ ] **Step 3: Filter kanban by selected pipeline**

Update `app/(app)/kanban/page.tsx` to accept `searchParams.pipeline`, load available pipelines, select the requested pipeline or default, and query only its stages and leads.

Pass pipelines and active ID into `KanbanBoard`. Add a compact native `<select>` above the columns. Navigating to another pipeline updates `/kanban?pipeline=${pipelineId}`.

- [ ] **Step 4: Verify manually**

Run:

```powershell
npm run dev
```

Open:

```text
http://localhost:3000/pipelines
http://localhost:3000/kanban
```

Expected: pipeline CRUD renders for authorized roles and kanban switches between pipeline IDs without mixing leads.

- [ ] **Step 5: Run verification**

```powershell
npm test
npm run build
```

- [ ] **Step 6: Commit when Git identity exists**

```powershell
git add 'app/(app)/pipelines' 'app/(app)/kanban/page.tsx' 'app/(app)/kanban/kanban-board.tsx'
git commit -m "feat: add configurable pipelines"
```

## Task 6: Add Technical Profile Fields

**Files:**
- Create: `lib/leads/custom-fields.ts`
- Create: `tests/custom-fields.test.mjs`
- Create: `app/(app)/leads/[id]/technical-profile-panel.tsx`
- Create: `app/(app)/leads/[id]/actions.ts`
- Modify: `app/(app)/leads/[id]/page.tsx`

- [ ] **Step 1: Write the failing normalizer test**

Create `tests/custom-fields.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

async function loadModule() {
  await mkdir("node_modules/.cache", { recursive: true });
  const outfile = "node_modules/.cache/custom-fields-test.mjs";
  await build({ entryPoints: ["lib/leads/custom-fields.ts"], bundle: true, platform: "node", format: "esm", outfile });
  return import(pathToFileURL(process.cwd() + "/" + outfile).href + `?v=${Date.now()}`);
}

test("normalizes typed technical fields", async () => {
  const { normalizeCustomFieldValues } = await loadModule();
  const values = normalizeCustomFieldValues(
    [
      { key: "comprimento_cm", field_type: "number", is_required: true },
      { key: "proxima_manutencao", field_type: "date", is_required: false },
      { key: "possui_fotos", field_type: "boolean", is_required: false },
    ],
    { comprimento_cm: "55", proxima_manutencao: "2026-07-10", possui_fotos: "true" },
  );
  assert.deepEqual(values, { comprimento_cm: 55, proxima_manutencao: "2026-07-10", possui_fotos: true });
});

test("rejects missing required technical field", async () => {
  const { normalizeCustomFieldValues } = await loadModule();
  assert.throws(() => normalizeCustomFieldValues([{ key: "metodo", field_type: "text", is_required: true }], {}), /metodo/);
});
```

- [ ] **Step 2: Verify RED**

```powershell
node --test tests/custom-fields.test.mjs
```

Expected: FAIL because module is absent.

- [ ] **Step 3: Implement normalizer**

Create `lib/leads/custom-fields.ts`:

```ts
type Definition = {
  key: string;
  field_type: "text" | "number" | "date" | "select" | "boolean" | "file";
  is_required: boolean;
};

export function normalizeCustomFieldValues(
  definitions: Definition[],
  values: Record<string, unknown>,
) {
  return Object.fromEntries(definitions.flatMap((definition) => {
    const raw = values[definition.key];
    if ((raw === undefined || raw === null || raw === "") && definition.is_required) {
      throw new Error(`Campo obrigatorio: ${definition.key}`);
    }
    if (raw === undefined || raw === null || raw === "") return [];
    if (definition.field_type === "number") return [[definition.key, Number(raw)]];
    if (definition.field_type === "boolean") return [[definition.key, raw === true || raw === "true"]];
    return [[definition.key, String(raw)]];
  }));
}
```

- [ ] **Step 4: Verify GREEN**

```powershell
node --test tests/custom-fields.test.mjs
```

- [ ] **Step 5: Add server action and panel**

Create `app/(app)/leads/[id]/actions.ts` with `updateTechnicalProfile(leadId, values)`. Load tenant definitions, normalize values, update `leads.custom_fields`, and insert a `lead_activities` row with kind `technical_profile_updated`.

Create `technical-profile-panel.tsx` with controls based on field type. Display the initial Megas fields in configured order. Use existing UI primitives and keep the panel compact.

Update the lead detail page to fetch definitions and render the panel below `Informacoes`.

- [ ] **Step 6: Verify**

```powershell
npm test
npm run build
```

- [ ] **Step 7: Commit when Git identity exists**

```powershell
git add lib/leads/custom-fields.ts tests/custom-fields.test.mjs 'app/(app)/leads/[id]'
git commit -m "feat: add configurable technical profile"
```

## Task 7: Add Lead Tasks

**Files:**
- Create: `app/(app)/leads/[id]/task-panel.tsx`
- Modify: `app/(app)/leads/[id]/actions.ts`
- Modify: `app/(app)/leads/[id]/page.tsx`

- [ ] **Step 1: Add task server actions**

Add to `app/(app)/leads/[id]/actions.ts`:

```ts
export async function createLeadTask(input: {
  leadId: string;
  title: string;
  notes?: string;
  dueAt?: string;
  assignedTo?: string;
}) {
  const ctx = await requireContext();
  const supabase = await createClient();
  const { error } = await supabase.from("tasks").insert({
    tenant_id: ctx.tenantId,
    lead_id: input.leadId,
    assigned_to: input.assignedTo || ctx.userId,
    created_by: ctx.userId,
    title: input.title.trim(),
    notes: input.notes?.trim() || null,
    due_at: input.dueAt || null,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/leads/${input.leadId}`);
}

export async function completeLeadTask(taskId: string, leadId: string) {
  const ctx = await requireContext();
  const supabase = await createClient();
  const { error } = await supabase
    .from("tasks")
    .update({ status: "done", completed_at: new Date().toISOString() })
    .eq("id", taskId)
    .eq("tenant_id", ctx.tenantId);
  if (error) throw new Error(error.message);
  revalidatePath(`/leads/${leadId}`);
}
```

- [ ] **Step 2: Build task panel**

Create `task-panel.tsx` with:

- open tasks first;
- overdue visual state;
- title, due date, and owner;
- create-task dialog;
- complete action;
- empty state: `Nenhuma tarefa pendente`.

Fetch tasks in the lead detail page and render the panel beside the timeline.

- [ ] **Step 3: Verify**

```powershell
npm run build
```

Manually create and complete a task on a test lead.

- [ ] **Step 4: Commit when Git identity exists**

```powershell
git add 'app/(app)/leads/[id]'
git commit -m "feat: add lead tasks"
```

## Task 8: Add Internal Scheduling

**Files:**
- Create: `lib/agenda/status.ts`
- Create: `tests/agenda-status.test.mjs`
- Create: `app/(app)/agenda/page.tsx`
- Create: `app/(app)/agenda/actions.ts`
- Create: `app/(app)/agenda/appointment-dialog.tsx`

- [ ] **Step 1: Write failing agenda status tests**

Create `tests/agenda-status.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

async function loadModule() {
  await mkdir("node_modules/.cache", { recursive: true });
  const outfile = "node_modules/.cache/agenda-status-test.mjs";
  await build({ entryPoints: ["lib/agenda/status.ts"], bundle: true, platform: "node", format: "esm", outfile });
  return import(pathToFileURL(process.cwd() + "/" + outfile).href + `?v=${Date.now()}`);
}

test("allows the supported appointment transitions", async () => {
  const { canTransitionAppointment } = await loadModule();
  assert.equal(canTransitionAppointment("scheduled", "confirmed"), true);
  assert.equal(canTransitionAppointment("confirmed", "completed"), true);
  assert.equal(canTransitionAppointment("cancelled", "confirmed"), false);
});
```

- [ ] **Step 2: Verify RED**

```powershell
node --test tests/agenda-status.test.mjs
```

- [ ] **Step 3: Implement transition rules**

Create `lib/agenda/status.ts`:

```ts
import type { AppointmentStatus } from "@/lib/supabase/database.types";

const transitions: Record<AppointmentStatus, AppointmentStatus[]> = {
  scheduled: ["confirmed", "cancelled", "no_show"],
  confirmed: ["completed", "cancelled", "no_show"],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function canTransitionAppointment(from: AppointmentStatus, to: AppointmentStatus) {
  return transitions[from].includes(to);
}
```

- [ ] **Step 4: Verify GREEN**

```powershell
node --test tests/agenda-status.test.mjs
```

- [ ] **Step 5: Implement agenda actions and page**

Create server actions for:

- `createAppointment`;
- `updateAppointment`;
- `transitionAppointmentStatus`;
- `createProfessional`;
- `createService`.

Validate appointment status changes with `canTransitionAppointment()`.

Build `app/(app)/agenda/page.tsx` with:

- day selector;
- appointments ordered by `starts_at`;
- status badge;
- client, service, professional, duration;
- create dialog;
- compact empty state;
- controls for confirm, complete, cancel, and mark no-show.

- [ ] **Step 6: Verify**

```powershell
npm test
npm run build
```

Manually create one professional, one service, one appointment, confirm it, and complete it.

- [ ] **Step 7: Commit when Git identity exists**

```powershell
git add lib/agenda/status.ts tests/agenda-status.test.mjs 'app/(app)/agenda'
git commit -m "feat: add internal scheduling"
```

## Task 9: Add Hair Inventory Reservations

**Files:**
- Create: `lib/estoque/reservations.ts`
- Create: `tests/stock-reservations.test.mjs`
- Create: `app/(app)/estoque/[id]/reservation-form.tsx`
- Modify: `app/(app)/estoque/actions.ts`
- Modify: `app/(app)/estoque/[id]/page.tsx`
- Modify: `app/(app)/estoque/page.tsx`

- [ ] **Step 1: Write failing reservation test**

Create `tests/stock-reservations.test.mjs`:

```js
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";
import { build } from "esbuild";

async function loadModule() {
  await mkdir("node_modules/.cache", { recursive: true });
  const outfile = "node_modules/.cache/stock-reservations-test.mjs";
  await build({ entryPoints: ["lib/estoque/reservations.ts"], bundle: true, platform: "node", format: "esm", outfile });
  return import(pathToFileURL(process.cwd() + "/" + outfile).href + `?v=${Date.now()}`);
}

test("calculates available stock after active reservations", async () => {
  const { availableStock } = await loadModule();
  assert.equal(availableStock(10, [{ quantity: 3, status: "active" }, { quantity: 2, status: "released" }]), 7);
});

test("rejects reservation above availability", async () => {
  const { assertReservationFits } = await loadModule();
  assert.throws(() => assertReservationFits(2, 3), /Estoque insuficiente/);
});
```

- [ ] **Step 2: Verify RED**

```powershell
node --test tests/stock-reservations.test.mjs
```

- [ ] **Step 3: Implement reservation helpers**

Create `lib/estoque/reservations.ts`:

```ts
export function availableStock(
  stockQuantity: number,
  reservations: Array<{ quantity: number; status: string }>,
) {
  return stockQuantity - reservations
    .filter((reservation) => reservation.status === "active")
    .reduce((sum, reservation) => sum + reservation.quantity, 0);
}

export function assertReservationFits(available: number, requested: number) {
  if (requested <= 0) throw new Error("Quantidade invalida");
  if (requested > available) throw new Error("Estoque insuficiente");
}
```

- [ ] **Step 4: Verify GREEN**

```powershell
node --test tests/stock-reservations.test.mjs
```

- [ ] **Step 5: Add reservation actions and UI**

Add `createReservation`, `releaseReservation`, and `consumeReservation` to stock actions. Query active reservations before inserting and call `assertReservationFits`.

Update stock pages to show:

- tone;
- length;
- texture;
- physical quantity;
- reserved quantity;
- available quantity;
- reservation form linked to lead and optionally appointment.

- [ ] **Step 6: Verify**

```powershell
npm test
npm run build
```

Manually reserve stock, release it, consume it, and confirm values remain consistent.

- [ ] **Step 7: Commit when Git identity exists**

```powershell
git add lib/estoque/reservations.ts tests/stock-reservations.test.mjs 'app/(app)/estoque'
git commit -m "feat: add hair stock reservations"
```

## Task 10: Wire Navigation and Dashboard

**Files:**
- Modify: `components/app/sidebar.tsx`
- Modify: `app/(app)/dashboard/page.tsx`
- Modify: `components/dashboard/leads-ops-dashboard.tsx`

- [ ] **Step 1: Add operational navigation**

Add `Agenda` and `Funis` to `components/app/sidebar.tsx`:

```ts
import { CalendarDays, GitBranch } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/kanban", label: "Kanban", icon: KanbanSquare },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/disparos", label: "Disparos", icon: Send },
  { href: "/chat", label: "Conversas", icon: MessageCircle },
  { href: "/estoque", label: "Estoque", icon: Boxes },
];

const secondaryItems = [
  { href: "/pipelines", label: "Funis", icon: GitBranch },
  { href: "/integrations", label: "Integracoes", icon: Plug },
  { href: "/settings", label: "Configuracoes", icon: Settings },
];
```

- [ ] **Step 2: Load foundation metrics**

Extend dashboard queries with:

- open shared-queue leads where `assigned_to is null`;
- appointments for the current BRT day;
- overdue tasks;
- low-stock products;
- active stock reservations.

Pass counts into `LeadsDashboardData`.

- [ ] **Step 3: Render compact metric cards**

Add cards for:

- fila compartilhada;
- horarios hoje;
- tarefas atrasadas;
- estoque baixo.

Keep the current daily-operation hierarchy and use the tenant brand color already injected by `TenantTheme`.

- [ ] **Step 4: Verify desktop and mobile layouts**

Run:

```powershell
npm run dev
```

Capture:

```text
http://localhost:3000/dashboard
http://localhost:3000/agenda
http://localhost:3000/kanban
http://localhost:3000/leads/$validationLeadId
```

Check desktop and mobile widths. Confirm no text overflow, nested cards, empty decorative panels, or broken navigation.

- [ ] **Step 5: Run verification**

```powershell
npm test
npm run build
```

- [ ] **Step 6: Commit when Git identity exists**

```powershell
git add components/app/sidebar.tsx 'app/(app)/dashboard/page.tsx' components/dashboard/leads-ops-dashboard.tsx
git commit -m "feat: expose Megas operational foundation"
```

## Task 11: Bootstrap the Empty Megas Perini Tenant

**Files:**
- Create locally only: `.env.local`
- Do not commit secrets.

- [ ] **Step 1: Rotate the exposed service role**

In Supabase Dashboard, rotate the previously exposed service-role credential before using the production project.

Do not store the old or new service-role key in source files, chat logs, `wrangler.jsonc`, or committed docs.

- [ ] **Step 2: Configure local environment**

Load the public anon key and the rotated service-role key into the local shell from
the secure source chosen by the user. Then create `.env.local` without printing
the keys:

```powershell
if (-not $env:MEGAS_SUPABASE_ANON_KEY) { throw "MEGAS_SUPABASE_ANON_KEY ausente" }
if (-not $env:MEGAS_SUPABASE_SERVICE_ROLE_KEY) { throw "MEGAS_SUPABASE_SERVICE_ROLE_KEY ausente" }
$webhookToken = [guid]::NewGuid().ToString("N")
@"
NEXT_PUBLIC_SUPABASE_URL=https://tiiurhpxduaywojbqbrg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=$env:MEGAS_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY=$env:MEGAS_SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL=http://localhost:3000
WHATSAPP_WEBHOOK_VERIFY_TOKEN=$webhookToken
"@ | Set-Content -LiteralPath .env.local
```

- [ ] **Step 3: Apply migrations to the linked Supabase project**

Run:

```powershell
npx supabase link --project-ref tiiurhpxduaywojbqbrg
npx supabase db push
```

Expected: all migrations apply successfully.

- [ ] **Step 4: Create the first administrator**

Create the first user through the app signup flow or Supabase Auth dashboard. Then execute:

```sql
update public.tenants
set
  name = 'Megas Perini',
  slug = 'megas-perini',
  tagline = 'Referencia em Mega Hair',
  brand_color = '#9d7e52'
where slug = 'megas-perini';

select public.seed_megas_perini_defaults(id)
from public.tenants
where slug = 'megas-perini';
```

Upload the approved Megas logo through the settings interface.

- [ ] **Step 5: Confirm empty production state**

Run in Supabase SQL Editor:

```sql
select count(*) as leads from public.leads;
select count(*) as appointments from public.appointments;
select count(*) as products from public.products;
select count(*) as tasks from public.tasks;
```

Expected: every count is `0`.

- [ ] **Step 6: Verify end-to-end foundation behavior**

With a temporary validation lead that will be deleted afterwards:

1. Log in as administrator.
2. Create professional and service.
3. Create a lead.
4. Confirm it enters the shared queue or receives round-robin assignment if an attendant is available.
5. Move it across kanban stages.
6. Fill the technical profile.
7. Create and complete a task.
8. Create, confirm, and complete an appointment.
9. Create one stock product.
10. Reserve and release stock.
11. Delete validation data.
12. Re-run the empty-state count queries.

Expected: all flows work and the final production counts return to `0`.

## Task 12: Build and Deployment Gate

**Files:**
- Modify only if needed: `wrangler.jsonc`
- Never commit credentials.

- [ ] **Step 1: Run the full local gate**

```powershell
npm test
npm run build
npx wrangler deploy --dry-run
```

Expected:

- all Node tests pass;
- Next.js build exits zero;
- Worker dry-run exits zero.

- [ ] **Step 2: Configure Cloudflare secrets**

Use Cloudflare secrets or dashboard variables. Never write service role into `wrangler.jsonc`.

```powershell
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY
```

Configure public variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_APP_URL
WHATSAPP_WEBHOOK_VERIFY_TOKEN
```

- [ ] **Step 3: Deploy**

```powershell
npm run deploy
```

Expected: OpenNext build completes and Wrangler prints the production Worker URL.

- [ ] **Step 4: Verify production**

Check:

- login page loads;
- administrator login succeeds;
- dashboard loads with empty state;
- `/leads`, `/kanban`, `/pipelines`, `/agenda`, and `/estoque` load;
- unauthorized routes redirect to login;
- production tenant shows Megas Perini identity;
- no credential appears in page source, browser logs, or committed files.

## Final Verification Checklist

Run:

```powershell
npm test
npm run build
npx wrangler deploy --dry-run
git status --short
git diff --check
```

Confirm:

- all new pure-domain behavior was added test-first;
- all foundation tests pass;
- build passes;
- Worker dry-run passes;
- migrations apply in a controlled environment;
- RLS was checked for administrator, manager, and attendant;
- production begins with no customer, appointment, task, or inventory demo data;
- no service-role key or provider credential is committed;
- unrelated dirty WHITE LABEL changes remain preserved.
