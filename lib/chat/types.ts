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
