export interface QuickMessagePreset {
  title: string;
  body: string;
}

/** Modelos iniciais em português — copiados para cada tenant na primeira vez. */
export const QUICK_MESSAGE_PRESETS: QuickMessagePreset[] = [
  {
    title: "Saudação",
    body: "Olá! Tudo bem? Como posso te ajudar hoje?",
  },
  {
    title: "Agradecimento",
    body: "Obrigado pelo contato! Qualquer dúvida, estou à disposição.",
  },
  {
    title: "Retorno em breve",
    body: "Recebi sua mensagem e retorno em instantes.",
  },
  {
    title: "Horário comercial",
    body: "Nosso horário de atendimento é de segunda a sexta, das 9h às 18h.",
  },
  {
    title: "Pedir dados",
    body: "Para seguir com seu atendimento, pode me informar seu nome completo e o melhor e-mail?",
  },
  {
    title: "Confirmar interesse",
    body: "Perfeito! Vou preparar as informações e já te envio os próximos passos.",
  },
  {
    title: "Agendar conversa",
    body: "Podemos agendar uma conversa rápida? Me diga dois horários que funcionam para você.",
  },
  {
    title: "Proposta enviada",
    body: "Acabei de enviar a proposta. Se quiser, revisamos juntos os detalhes.",
  },
  {
    title: "Follow-up",
    body: "Passando para saber se ficou alguma dúvida sobre nossa última conversa.",
  },
  {
    title: "Encerramento",
    body: "Fico feliz em ter ajudado! Conte conosco quando precisar.",
  },
];

/** Pares título+corpo antigos (sem acento) → versão corrigida para migração no banco. */
export const QUICK_MESSAGE_ACCENT_FIXES: { oldTitle: string; oldBody: string; title: string; body: string }[] =
  QUICK_MESSAGE_PRESETS.map((p, i) => {
    const legacy = [
      { title: "Saudacao", body: "Ola! Tudo bem? Como posso te ajudar hoje?" },
      { title: "Agradecimento", body: "Obrigado pelo contato! Qualquer duvida, estou a disposicao." },
      { title: "Retorno em breve", body: "Recebi sua mensagem e retorno em instantes." },
      { title: "Horario comercial", body: "Nosso horario de atendimento e de segunda a sexta, das 9h as 18h." },
      { title: "Pedir dados", body: "Para seguir com seu atendimento, pode me informar seu nome completo e o melhor e-mail?" },
      { title: "Confirmar interesse", body: "Perfeito! Vou preparar as informacoes e ja te envio os proximos passos." },
      { title: "Agendar conversa", body: "Podemos agendar uma conversa rapida? Me diga dois horarios que funcionam para voce." },
      { title: "Proposta enviada", body: "Acabei de enviar a proposta. Se quiser, revisamos juntos os detalhes." },
      { title: "Follow-up", body: "Passando para saber se ficou alguma duvida sobre nossa ultima conversa." },
      { title: "Encerramento", body: "Fico feliz em ter ajudado! Conte conosco quando precisar." },
    ];
    return { oldTitle: legacy[i].title, oldBody: legacy[i].body, title: p.title, body: p.body };
  });
