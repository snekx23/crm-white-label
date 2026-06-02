export type ChatMessage = {
  id: string;
  body: string | null;
  direction: "inbound" | "outbound";
  created_at: string;
  status: string;
  media_url?: string | null;
  media_type?: string | null;
};

export type ConversationListItem = {
  id: string;
  leadId: string;
  leadName: string;
  leadPhone: string;
  leadSubtitle: string;
  lastAt: string | null;
  unread: number;
  lastPreview: string | null;
  lastDirection: string | null;
};

export type GroupLabelItem = {
  id: string;
  name: string;
  color: string;
};

export type WhatsAppGroupListItem = {
  id: string;
  providerGroupId: string;
  subject: string;
  description: string | null;
  participantCount: number | null;
  lastEventType: string | null;
  lastAt: string | null;
  lastPreview: string | null;
  lastDirection: "inbound" | "outbound" | null;
  labels: GroupLabelItem[];
};
