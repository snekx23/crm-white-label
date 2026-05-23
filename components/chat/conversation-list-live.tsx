"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { fetchConversationItems } from "@/lib/chat/client";
import type { ConversationListItem } from "@/lib/chat/types";
import { ConversationList } from "@/app/(app)/chat/conversation-list";

/** Fallback se realtime falhar; intervalo longo para não travar a UI. */
const POLL_MS = 12_000;

export function ConversationListLive({
  tenantId,
  initialItems,
}: {
  tenantId: string;
  initialItems: ConversationListItem[];
}) {
  const [items, setItems] = useState(initialItems);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const next = await fetchConversationItems(tenantId);
      setItems(next);
    } catch {
      /* mantém lista anterior */
    }
  }, [tenantId]);

  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => void refresh(), 400);
  }, [refresh]);

  useEffect(() => {
    setItems(initialItems);
  }, [initialItems]);

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
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [tenantId, scheduleRefresh]);

  return <ConversationList items={items} />;
}
