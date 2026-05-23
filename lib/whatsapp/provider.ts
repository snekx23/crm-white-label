import type { WhatsAppAccount } from "@/lib/supabase/database.types";

export interface SendMessageInput {
  to: string;
  body?: string;
  mediaUrl?: string;
  mediaType?: string;
}

/** Meta Cloud API template (HSM). Evolution/Z-API: converted to plain text in adapters. */
export interface SendTemplateInput {
  to: string;
  templateName: string;
  languageCode: string;
  /** Ordered body variable values ({{1}}, {{2}}, …) */
  bodyParameters: string[];
}

export interface SendMessageResult {
  externalId: string;
  status: "sent" | "pending" | "failed";
  raw?: unknown;
}

export interface InboundNormalized {
  externalId: string;
  /** Telefone do lead/contato (legado; use contactPhone/contactLid). */
  fromPhone: string;
  contactPhone?: string | null;
  contactLid?: string | null;
  toPhone: string;
  direction: "inbound" | "outbound";
  body?: string;
  mediaUrl?: string;
  mediaType?: string;
  timestamp: string;
  contactName?: string;
  /** Status de entrega/leitura (mensagens enviadas). */
  messageStatus?: "sent" | "delivered" | "read";
}

export interface WhatsAppProvider {
  readonly kind: "cloud_api" | "evolution" | "zapi";
  send(input: SendMessageInput): Promise<SendMessageResult>;
  /** Optional: not all providers support Meta-style templates; fallback is plain text. */
  sendTemplate?(input: SendTemplateInput): Promise<SendMessageResult>;
  parseWebhook(payload: unknown): InboundNormalized[];
}
