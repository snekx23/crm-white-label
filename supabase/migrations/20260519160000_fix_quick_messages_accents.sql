-- Corrige textos sem acento nos modelos padrão de mensagens rápidas
update public.quick_messages
set title = 'Saudação', body = 'Olá! Tudo bem? Como posso te ajudar hoje?'
where title = 'Saudacao' and body = 'Ola! Tudo bem? Como posso te ajudar hoje?';

update public.quick_messages
set body = 'Obrigado pelo contato! Qualquer dúvida, estou à disposição.'
where title = 'Agradecimento' and body = 'Obrigado pelo contato! Qualquer duvida, estou a disposicao.';

update public.quick_messages
set title = 'Horário comercial', body = 'Nosso horário de atendimento é de segunda a sexta, das 9h às 18h.'
where title = 'Horario comercial';

update public.quick_messages
set body = 'Perfeito! Vou preparar as informações e já te envio os próximos passos.'
where title = 'Confirmar interesse' and body like '%informacoes%';

update public.quick_messages
set body = 'Podemos agendar uma conversa rápida? Me diga dois horários que funcionam para você.'
where title = 'Agendar conversa' and body like '%rapida%';

update public.quick_messages
set body = 'Passando para saber se ficou alguma dúvida sobre nossa última conversa.'
where title = 'Follow-up' and body like '%duvida%';
