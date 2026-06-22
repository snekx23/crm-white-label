import type { WhatsAppAccount } from "@/lib/supabase/database.types";
import { isSelfWhatsAppContact } from "@/lib/whatsapp/self-contact";
import { isValidBrazilWhatsAppPhone } from "@/lib/whatsapp/phone";

export type ConversationStatus =
  | "nao_iniciada"
  | "aguardando"
  | "em_atendimento"
  | "resolvida";

export type ConversationLeadRow = {
  id: string;
  lead_id: string;
  last_message_at: string | null;
  unread_count: number | null;
  status?: ConversationStatus | null;
  leads: { name: string | null; phone: string | null; whatsapp_lid?: string | null } | null;
};

/** Remove ruído (telefone inválido, conversa consigo) e deduplica por telefone do lead. */
export function filterConversationRows(
  rows: ConversationLeadRow[],
  account: WhatsAppAccount | null,
): ConversationLeadRow[] {
  const valid = rows.filter((c) => isValidBrazilWhatsAppPhone(c.leads?.phone ?? ""));

  const withoutSelf = account
    ? valid.filter(
        (c) =>
          !isSelfWhatsAppContact(account, {
            phone: c.leads?.phone,
            lid: c.leads?.whatsapp_lid ?? null,
          }),
      )
    : valid;

  const byPhone = new Map<string, ConversationLeadRow>();
  for (const row of withoutSelf) {
    const phone = row.leads?.phone ?? "";
    if (!phone) continue;
    const prev = byPhone.get(phone);
    if (!prev) {
      byPhone.set(phone, row);
      continue;
    }
    const prevAt = prev.last_message_at ? Date.parse(prev.last_message_at) : 0;
    const rowAt = row.last_message_at ? Date.parse(row.last_message_at) : 0;
    if (rowAt >= prevAt) byPhone.set(phone, row);
  }

  return [...byPhone.values()].sort((a, b) => {
    const aAt = a.last_message_at ? Date.parse(a.last_message_at) : 0;
    const bAt = b.last_message_at ? Date.parse(b.last_message_at) : 0;
    return bAt - aAt;
  });
}
