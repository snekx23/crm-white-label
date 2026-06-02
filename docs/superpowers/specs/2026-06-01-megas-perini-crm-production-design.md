# CRM Megas Perini - Design de Producao

## Objetivo

Transformar o CRM WHITE LABEL existente em um CRM dedicado para a Megas Perini,
com identidade visual propria e uma operacao comercial inspirada nas capacidades
do Datacrazy. O sistema deve entrar em producao com base vazia e permitir que a
equipe gerencie leads, conversas, agenda, funis, tarefas, estoque, automacoes e
relatorios em um unico ambiente.

O projeto reaproveita a arquitetura comprovada do WHITE LABEL. Nao sera feita uma
copia de codigo proprietario do Datacrazy. A referencia serve para reproduzir os
fluxos de trabalho necessarios para a operacao da Megas Perini.

## Decisoes Validadas

- Evoluir o CRM WHITE LABEL existente em vez de construir do zero.
- Incluir chat WhatsApp e automacoes ja na primeira versao real.
- Capturar leads vindos de WhatsApp, formularios, anuncios Meta e cadastro manual.
- Entregar um editor visual de fluxos com ramificacoes e esperas.
- Criar logins individuais com perfis administrador, gerente e atendente.
- Usar distribuicao hibrida: round-robin automatico com assumir, transferir ou
  devolver lead para a fila compartilhada.
- Manter integracao WhatsApp modular: Evolution API, Z-API e Meta Cloud API.
- Comecar a homologacao do WhatsApp com Evolution API quando o numero for
  disponibilizado.
- Criar agenda interna completa, sem agendamento publico na primeira versao.
- Permitir varios funis configuraveis.
- Iniciar com os funis Novas clientes, Aplicacoes e Manutencoes e retornos.
- Fornecer ficha tecnica inicial de mega hair com campos personalizados
  configuraveis pelo administrador.
- Entregar relatorios gerenciais completos.
- Iniciar producao sem clientes ficticios.
- Deixar Facebook Lead Ads e formularios Meta preparados para ativacao posterior,
  aguardando credenciais da empresa.

## Arquitetura

O sistema continuara usando:

- Next.js App Router para interface autenticada, paginas server-side e APIs.
- Supabase Auth para login e sessao.
- Supabase Postgres com RLS para isolamento e controle de acesso.
- Supabase Realtime para kanban, chat, filas e atualizacoes de tarefas.
- Supabase Storage para fotos da cliente, arquivos e anexos.
- Cloudflare Workers com OpenNext para publicacao.

O projeto sera dedicado a Megas Perini, mas deve preservar a organizacao
multi-tenant do WHITE LABEL. Isso evita remover protecoes existentes e permite
reaproveitar a infraestrutura validada.

Operacoes administrativas e webhooks usarao service role exclusivamente no
servidor. O navegador recebera apenas a chave publica anon. A chave service role
exposta durante o planejamento deve ser rotacionada antes da implantacao.

## Modulos

### Dashboard

O painel inicial apresentara:

- novos leads por periodo;
- leads por origem;
- valor do pipeline;
- conversoes por etapa e por funil;
- horarios do dia;
- comparecimentos, reagendamentos e cancelamentos;
- tarefas atrasadas;
- estoque baixo;
- tempo medio de primeira resposta;
- volume e resultado das automacoes.

### Leads e Fila Compartilhada

Todo contato sera registrado como lead com origem, telefone, dados tecnicos,
responsavel, funil, etapa, tags, historico, tarefas, anexos e conversas.

Leads novos entram em uma fila compartilhada. Um fluxo de distribuicao tenta
atribui-los por round-robin aos atendentes disponiveis. Atendentes podem assumir
um lead livre, transferir um atendimento ou devolve-lo a fila. Gerentes e
administradores visualizam toda a operacao.

O cadastro manual e a importacao CSV permanecem disponiveis. A base inicial de
producao sera vazia.

### Funis e Kanban

O administrador podera criar, editar e ordenar funis e etapas. O sistema
comecara com:

1. Novas clientes
2. Aplicacoes
3. Manutencoes e retornos

Cada lead pertence a um funil e uma etapa. A movimentacao por arrastar atualiza
o banco em tempo real, registra historico e pode disparar automacoes.

### Ficha Tecnica Megas Perini

A ficha tera campos fixos essenciais e campos personalizados configuraveis.
Campos iniciais:

- metodo aplicado;
- cor e tonalidade;
- comprimento;
- textura;
- volume;
- fotos antes e depois;
- orcamentos;
- datas de aplicacao e manutencao;
- observacoes tecnicas.

Campos personalizados devem aceitar texto, numero, data, selecao, booleano e
arquivo. O administrador define nome, tipo, obrigatoriedade e ordem.

### Agenda Interna

A agenda permitira criar, editar, confirmar, reagendar e cancelar horarios.
Cada horario tera:

- cliente;
- profissional responsavel;
- servico;
- inicio;
- duracao;
- status;
- observacoes;
- lembretes;
- vinculo com funil, tarefa e conversa.

Nao havera pagina publica de agendamento nesta fase. Confirmacoes e lembretes
poderao ser enviados por WhatsApp quando a integracao estiver conectada.

### Conversas WhatsApp

O chat sera integrado ao cadastro da cliente e exibira:

- lista de conversas;
- fila de mensagens nao lidas;
- responsavel;
- historico;
- anexos;
- status de envio, entrega e leitura;
- mensagens rapidas;
- envio manual;
- mensagens automaticas identificadas no historico.

Os provedores serao plugaveis por uma interface comum:

- Evolution API;
- Z-API;
- Meta Cloud API.

Sem numero ou credenciais, o modulo deve exibir estado de configuracao pendente,
sem quebrar os demais recursos.

### Disparos

Campanhas segmentadas permitirao selecionar publico por:

- funil e etapa;
- origem;
- responsavel;
- tags;
- campos personalizados;
- manutencao prevista;
- data do ultimo contato.

O sistema exibira previa da audiencia, status da campanha, envios, falhas e
historico. As regras especificas do provedor WhatsApp devem ser respeitadas.

### Editor Visual de Automacoes

O editor visual permitira montar fluxos conectando blocos em um canvas. Cada
fluxo podera ser salvo como rascunho, ativado, pausado e versionado.

Gatilhos iniciais:

- lead entrou no CRM;
- lead mudou de etapa;
- cliente enviou mensagem no WhatsApp;
- cliente ficou sem responder por um periodo;
- horario foi criado;
- horario esta proximo;
- horario foi cancelado ou reagendado.

Blocos de controle:

- aguardar periodo;
- condicao;
- ramificacao sim ou nao;
- encerrar fluxo.

Acoes iniciais:

- enviar mensagem automatica;
- mover lead no kanban;
- atribuir responsavel;
- criar tarefa ou lembrete;
- adicionar tag;
- atualizar campo da ficha;
- registrar atividade.

Cada execucao tera log com fluxo, versao, lead, bloco atual, resultado, erro e
datas. Esperas devem ser persistidas no banco para sobreviver a deploys e
reinicios. Um processador server-side executara passos pendentes com idempotencia
para evitar mensagens duplicadas.

### Estoque

O estoque existente sera mantido e adaptado para fios e materiais:

- cadastro de produto;
- SKU;
- tonalidade;
- comprimento;
- textura;
- quantidade;
- limite minimo;
- entrada, saida e ajuste;
- reserva vinculada a cliente ou horario;
- alerta de estoque baixo.

### Relatorios

Relatorios iniciais:

- quantidade de leads;
- origem dos contatos;
- conversao por etapa e por funil;
- vendas e ticket medio;
- agenda e taxa de comparecimento;
- desempenho por atendente;
- tempo medio de resposta no WhatsApp;
- tarefas atrasadas;
- execucoes das automacoes;
- estoque e itens em baixa;
- recorrencia de manutencao.

## Perfis e Permissoes

### Administrador

Pode gerenciar usuarios, permissoes, funis, campos personalizados, agenda,
integracoes, automacoes, disparos, estoque e relatorios.

### Gerente

Pode visualizar toda a operacao, distribuir e transferir leads, gerenciar agenda,
acompanhar relatorios, consultar logs e operar campanhas autorizadas.

### Atendente

Pode acessar seus leads e a fila compartilhada, assumir contatos, conversar,
registrar tarefas, atualizar ficha e movimentar leads conforme permissao. Nao
pode alterar integracoes, usuarios ou configuracoes sensiveis.

## Integracoes Externas

### WhatsApp

A estrutura sera entregue pronta. A ativacao ocorrera quando a Megas Perini
informar o numero e o provedor escolhido para homologacao. A recomendacao inicial
e Evolution API.

### Meta Lead Ads e Formularios

A estrutura de configuracao e o endpoint de entrada serao entregues. A ativacao
ficara pendente ate a empresa liberar as credenciais da conta Meta.

Todo lead importado automaticamente deve registrar origem, campanha, conjunto de
anuncios, anuncio e formulario quando esses dados estiverem disponiveis.

## Modelo de Dados Adicional

O schema atual do WHITE LABEL sera preservado e ampliado com tabelas para:

- disponibilidade e status dos atendentes;
- fila e historico de atribuicao;
- profissionais;
- servicos;
- horarios;
- lembretes de agenda;
- definicoes de campos personalizados;
- valores de campos personalizados;
- definicoes e versoes de automacoes;
- blocos e conexoes dos fluxos;
- execucoes e passos pendentes;
- tarefas;
- reservas de estoque;
- configuracao Meta e dados de campanha dos leads.

Todas as tabelas operacionais devem conter tenant_id, indices adequados e
politicas RLS.

## Tratamento de Erros

- Falhas de provedor WhatsApp ficam registradas e visiveis para reprocessamento.
- Passos automaticos usam chave de idempotencia para evitar duplicacao.
- Um fluxo pausado nao cria novas execucoes, mas preserva historico.
- Leads sem responsavel permanecem na fila compartilhada.
- Credenciais ausentes geram estado pendente de configuracao.
- Falhas na Meta nao impedem cadastro manual ou WhatsApp.
- Logs administrativos nao devem expor tokens ou credenciais.

## Entregas

### Entrega 1 - Fundacao Operacional

- derivacao segura do WHITE LABEL;
- identidade Megas Perini;
- Supabase configurado;
- login e perfis;
- leads;
- fila compartilhada;
- atribuicao hibrida;
- multiplos funis;
- kanban;
- ficha tecnica configuravel;
- tarefas;
- agenda interna;
- dashboard inicial;
- estoque adaptado.

### Entrega 2 - Comunicacao

- configuracao modular WhatsApp;
- chat;
- mensagens rapidas;
- anexos;
- disparos;
- estados pendentes quando ainda nao houver credenciais;
- estrutura Meta preparada para ativacao posterior.

### Entrega 3 - Automacoes e Gestao

- editor visual;
- motor de execucao persistente;
- gatilhos, condicoes, esperas e ramificacoes;
- acoes iniciais;
- logs;
- relatorios completos;
- testes de fluxo.

As entregas fazem parte da primeira versao comercial, mas serao implantadas em
sequencia para permitir validacao incremental.

## Validacao

Antes da entrada em vigor:

- executar lint, build e testes automatizados;
- aplicar migrations em ambiente controlado;
- validar RLS por perfil;
- testar login e recuperacao de sessao;
- testar cadastro manual, fila, round-robin e transferencia;
- testar kanban em tempo real;
- testar agenda e lembretes;
- testar ficha tecnica e uploads;
- testar estoque e reservas;
- testar cada bloco de automacao com logs;
- validar idempotencia do processador;
- homologar WhatsApp quando houver numero e credenciais;
- homologar Meta quando houver credenciais;
- verificar layout desktop e mobile;
- confirmar base de producao vazia.

## Dependencias Pendentes da Empresa

- rotacionar a chave Supabase service role exposta durante o planejamento;
- fornecer a nova service role por canal seguro;
- informar numero de WhatsApp;
- escolher o provedor de homologacao;
- fornecer credenciais do provedor;
- fornecer acessos Meta quando a integracao for ativada;
- informar nomes, emails e perfis dos usuarios;
- informar profissionais, servicos, duracoes e horarios de funcionamento.
