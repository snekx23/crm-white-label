import { cookies } from "next/headers";
import { cache } from "react";
import { createClient } from "./supabase/server";
import type { Tenant, MemberRole } from "./supabase/database.types";

export interface CurrentContext {
  userId: string;
  userEmail: string;
  tenantId: string;
  tenant: Tenant;
  role: MemberRole;
}

const TENANT_COOKIE = "avante_tenant_id";

export const getCurrentContext = cache(async (): Promise<CurrentContext | null> => {
  console.log("[getCurrentContext] Called");
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    console.error("[getCurrentContext] getUser error:", userError);
  }
  
  if (!user) {
    console.log("[getCurrentContext] No user found in session");
    return null;
  }
  console.log("[getCurrentContext] User found:", user.email, user.id);

  const cookieStore = await cookies();
  const cookieTenant = cookieStore.get(TENANT_COOKIE)?.value;
  console.log("[getCurrentContext] Cookie tenant:", cookieTenant);

  const { data: memberships, error: memError } = await supabase
    .from("tenant_members")
    .select("tenant_id, role, tenants(*)")
    .eq("user_id", user.id);

  if (memError) {
    console.error("[getCurrentContext] memberships fetch error:", memError);
    return null;
  }

  console.log("[getCurrentContext] memberships found count:", memberships?.length);

  if (!memberships || memberships.length === 0) {
    console.log("[getCurrentContext] No memberships found for user");
    return null;
  }

  const chosen =
    memberships.find((m) => m.tenant_id === cookieTenant) ?? memberships[0];

  const tenant = (chosen as unknown as { tenants: Tenant }).tenants;
  
  console.log("[getCurrentContext] Selected tenant:", tenant?.id, tenant?.name);
  
  return {
    userId: user.id,
    userEmail: user.email ?? "",
    tenantId: chosen.tenant_id,
    tenant,
    role: chosen.role as MemberRole,
  };
});

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
