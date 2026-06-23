"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/leads": "Leads",
  "/kanban": "Kanban",
  "/agenda": "Agenda",
  "/reunioes": "Reuniões",
  "/chat": "Conversas",
  "/estoque": "Estoque",
  "/integrations": "Integracoes",
  "/settings": "Configuracoes",
};

function segmentLabel(pathname: string): string | null {
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname];
  if (pathname.startsWith("/chat/")) return "Conversa";
  if (pathname.startsWith("/leads/")) return "Lead";
  return null;
}

export function TenantPageTitle({ tenantName }: { tenantName: string }) {
  const pathname = usePathname();
  const brand = tenantName.trim() || "CRM";

  useEffect(() => {
    const page = segmentLabel(pathname);
    document.title = page ? `${page} · ${brand}` : `${brand} CRM`;
  }, [pathname, brand]);

  return null;
}
