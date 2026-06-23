"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchConversationItems, fetchWhatsAppGroupItems } from "@/lib/chat/client";
import type { ConversationListItem, WhatsAppGroupListItem } from "@/lib/chat/types";
import { ConversationList } from "@/app/(app)/chat/conversation-list";

/** Fallback se realtime falhar; intervalo longo para não travar a UI. */
const POLL_MS = 12_000;

export function ConversationListLive({
  tenantId,
  initialItems,
  initialGroups,
}: {
  tenantId: string;
  initialItems: ConversationListItem[];
  initialGroups: WhatsAppGroupListItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const [groups, setGroups] = useState(initialGroups);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [next, nextGroups] = await Promise.all([
        fetchConversationItems(tenantId),
        fetchWhatsAppGroupItems(tenantId),
      ]);
      setItems(next);
      setGroups(nextGroups);
    } catch {
      /* mantém lista anterior */
    }
  }, [tenantId]);

  // Debounce maior: grupos ativos geram muitos eventos de realtime; coalesce as rajadas.
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => void refresh(), 2500);
  }, [refresh]);

  useEffect(() => {
    setItems(initialItems);
    setGroups(initialGroups);
  }, [initialItems, initialGroups]);

  useEffect(() => {
    const timer = setInterval(() => void refresh(), POLL_MS);
    return () => clearInterval(timer);
  }, [refresh]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`conversations-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "conversations",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_groups",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => scheduleRefresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "whatsapp_group_label_assignments",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => scheduleRefresh(),
      )
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [tenantId, scheduleRefresh]);

  return <ConversationList items={items} groups={groups} />;
}
