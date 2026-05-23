import { cookies } from "next/headers";
import { createClient } from "./supabase/server";
import type { Tenant, MemberRole } from "./supabase/database.types";

export interface CurrentContext {
  userId: string;
  tenantId: string;
  tenant: Tenant;
  role: MemberRole;
}

const TENANT_COOKIE = "avante_tenant_id";

export async function getCurrentContext(): Promise<CurrentContext | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const cookieStore = await cookies();
  const cookieTenant = cookieStore.get(TENANT_COOKIE)?.value;

  const { data: memberships } = await supabase
    .from("tenant_members")
    .select("tenant_id, role, tenants(*)")
    .eq("user_id", user.id);

  if (!memberships || memberships.length === 0) return null;

  const chosen =
    memberships.find((m) => m.tenant_id === cookieTenant) ?? memberships[0];

  const tenant = (chosen as unknown as { tenants: Tenant }).tenants;
  return {
    userId: user.id,
    tenantId: chosen.tenant_id,
    tenant,
    role: chosen.role as MemberRole,
  };
}

export async function requireContext(): Promise<CurrentContext> {
  const ctx = await getCurrentContext();
  if (!ctx) throw new Error("Nao autenticado ou sem tenant");
  return ctx;
}

export async function setActiveTenant(tenantId: string) {
  const cookieStore = await cookies();
  cookieStore.set(TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
