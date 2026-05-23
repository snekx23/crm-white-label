export interface DisparoPreset {
  id: string;
  name: string;
  body: string;
  description: string;
}

export const DISPARO_CAMPAIGN_PRESETS: DisparoPreset[] = [
  {
    id: "reativacao",
    name: "Reativação de lead",
    description: "Retomar contato com quem parou de responder",
    body: "Olá {{first_name}}, tudo bem? Passando para retomar nossa conversa. Posso te ajudar com alguma dúvida?",
  },
  {
    id: "promocao",
    name: "Promoção / oferta",
    description: "Comunicar condição especial por tempo limitado",
    body: "Oi {{first_name}}! Temos uma condição especial esta semana. Quer que eu te envie os detalhes no WhatsApp?",
  },
  {
    id: "agendamento",
    name: "Convite para reunião",
    description: "Marcar call ou visita comercial",
    body: "Olá {{name}}! Gostaria de agendar uma conversa rápida. Qual horário funciona melhor para você hoje ou amanhã?",
  },
  {
    id: "pos-venda",
    name: "Pós-venda",
    description: "Acompanhar satisfação após fechamento",
    body: "Oi {{first_name}}, como está sendo sua experiência até aqui? Estou à disposição se precisar de qualquer suporte.",
  },
  {
    id: "cobranca-leve",
    name: "Follow-up comercial",
    description: "Cobrança educada de retorno",
    body: "Olá {{first_name}}! Vi que ainda não conseguimos avançar. Ainda faz sentido conversarmos sobre {{source}}?",
  },
];
