import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade | Solaire W+ CRM",
  description: "Política de privacidade da plataforma Solaire W+ CRM.",
};

const UPDATED_AT = "15 de junho de 2026";
const CONTACT_EMAIL = "solairew3@gmail.com";
const APP_NAME = "Solaire W+ CRM";
const APP_URL = "https://solaire-w-crm.raminhos6899.workers.dev";

export default function PrivacyPage() {
  return (
    <article className="prose prose-neutral dark:prose-invert max-w-none">
      <h1>Política de Privacidade</h1>
      <p className="text-muted-foreground text-sm">Última atualização: {UPDATED_AT}</p>

      <p>
        Esta Política de Privacidade descreve como o <strong>{APP_NAME}</strong> (&quot;nós&quot;,
        &quot;nosso&quot; ou &quot;Plataforma&quot;), disponível em{" "}
        <a href={APP_URL}>{APP_URL}</a>, coleta, usa, armazena e protege as informações dos
        usuários e dos leads gerenciados por meio de nossa plataforma.
      </p>

      <hr />

      <h2>1. Quem somos</h2>
      <p>
        O {APP_NAME} é uma plataforma SaaS (Software como Serviço) de CRM white-label que permite
        a empresas gerenciar leads, conversas e automações de atendimento. Cada empresa que se
        cadastra na plataforma é responsável pelos dados que insere e coleta por meio de suas
        integrações.
      </p>
      <p>
        Contato do responsável pela plataforma:{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
      </p>

      <h2>2. Dados que coletamos</h2>

      <h3>2.1 Dados dos usuários da plataforma (empresas e colaboradores)</h3>
      <ul>
        <li>Nome e endereço de e-mail (fornecidos no cadastro)</li>
        <li>Senha (armazenada de forma criptografada via Supabase Auth)</li>
        <li>Informações da empresa (nome, configurações do workspace)</li>
        <li>Registros de acesso e atividade na plataforma</li>
      </ul>

      <h3>2.2 Dados de leads gerenciados pelas empresas</h3>
      <ul>
        <li>Nome, telefone, e-mail e outros dados inseridos manualmente</li>
        <li>Mensagens de conversas via WhatsApp ou Instagram DM</li>
        <li>Histórico de interações, anotações e status no funil de vendas</li>
        <li>Identificadores de redes sociais (como ID do Instagram)</li>
      </ul>

      <h3>2.3 Dados coletados automaticamente</h3>
      <ul>
        <li>Endereço IP e dados técnicos da conexão</li>
        <li>Logs de requisições para fins de segurança e diagnóstico</li>
        <li>Cookies de sessão necessários para o funcionamento do sistema</li>
      </ul>

      <h2>3. Integração com Meta (Facebook e Instagram)</h2>
      <p>
        Nossa plataforma oferece integração com a API do Instagram (Meta Platforms) para capturar
        leads via Direct Messages. Ao conectar uma conta do Instagram:
      </p>
      <ul>
        <li>
          Solicitamos permissões de <code>instagram_business_basic</code> e{" "}
          <code>instagram_business_manage_messages</code> para receber e processar mensagens.
        </li>
        <li>
          Os tokens de acesso fornecidos pelo Meta são armazenados de forma segura e utilizados
          exclusivamente para receber mensagens recebidas na conta conectada.
        </li>
        <li>
          <strong>Não vendemos, compartilhamos ou utilizamos dados do Instagram para fins
          publicitários.</strong> Os dados são usados exclusivamente para criar e gerenciar leads
          dentro da plataforma.
        </li>
        <li>
          Cada empresa é responsável por obter o consentimento adequado de seus contatos conforme
          as políticas da Meta e a legislação aplicável.
        </li>
      </ul>
      <p>
        Para solicitar a exclusão dos dados coletados via integração com Instagram, utilize o
        endpoint de exclusão de dados disponível em:{" "}
        <code>{APP_URL}/api/auth/instagram/data-deletion</code>, conforme exigido pelas Políticas
        de Plataforma da Meta.
      </p>

      <h2>4. Como usamos as informações</h2>
      <ul>
        <li>Fornecer e manter os serviços da plataforma</li>
        <li>Autenticar usuários e proteger contas</li>
        <li>Processar mensagens recebidas via integrações e criar leads automaticamente</li>
        <li>Enviar notificações relacionadas ao serviço (sem fins de marketing, a não ser que você opte por isso)</li>
        <li>Diagnosticar problemas técnicos e melhorar a plataforma</li>
        <li>Cumprir obrigações legais</li>
      </ul>

      <h2>5. Compartilhamento de dados</h2>
      <p>
        Não vendemos seus dados a terceiros. Podemos compartilhar informações apenas nas seguintes
        situações:
      </p>
      <ul>
        <li>
          <strong>Provedores de infraestrutura:</strong> Supabase (banco de dados e autenticação)
          e Cloudflare (hospedagem), que atuam como processadores de dados sob contrato.
        </li>
        <li>
          <strong>Meta Platforms:</strong> para troca de tokens e recebimento de mensagens via
          API, conforme as Políticas de Plataforma da Meta.
        </li>
        <li>
          <strong>Determinação legal:</strong> quando exigido por lei, ordem judicial ou
          autoridade competente.
        </li>
      </ul>

      <h2>6. Retenção de dados</h2>
      <p>
        Os dados são retidos enquanto a conta da empresa estiver ativa. Após o encerramento da
        conta, os dados são excluídos em até <strong>90 dias</strong>, salvo obrigação legal de
        retenção por período maior.
      </p>

      <h2>7. Segurança</h2>
      <p>
        Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados, incluindo:
        criptografia em trânsito (HTTPS/TLS), criptografia de senhas, isolamento de dados por
        tenant via Row-Level Security (RLS) no banco de dados, e controle de acesso por
        autenticação.
      </p>

      <h2>8. Seus direitos (LGPD)</h2>
      <p>
        Nos termos da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), você tem direito a:
      </p>
      <ul>
        <li>Confirmar a existência de tratamento dos seus dados</li>
        <li>Acessar, corrigir ou atualizar seus dados</li>
        <li>Solicitar a exclusão dos seus dados</li>
        <li>Revogar consentimentos fornecidos</li>
        <li>Portabilidade dos dados, quando aplicável</li>
      </ul>
      <p>
        Para exercer qualquer um desses direitos, entre em contato pelo e-mail{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2>9. Cookies</h2>
      <p>
        Utilizamos apenas cookies estritamente necessários para manter a sessão de usuários
        autenticados. Não utilizamos cookies de rastreamento ou publicidade.
      </p>

      <h2>10. Menores de idade</h2>
      <p>
        Nossa plataforma é destinada exclusivamente a empresas e profissionais maiores de 18 anos.
        Não coletamos intencionalmente dados de menores.
      </p>

      <h2>11. Alterações nesta política</h2>
      <p>
        Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre
        alterações significativas por e-mail ou via aviso na plataforma. O uso continuado dos
        serviços após as alterações constitui aceitação da política atualizada.
      </p>

      <h2>12. Contato</h2>
      <p>
        Em caso de dúvidas, solicitações ou reclamações relacionadas a esta Política de
        Privacidade, entre em contato:
      </p>
      <ul>
        <li>
          <strong>E-mail:</strong>{" "}
          <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
        </li>
        <li>
          <strong>Plataforma:</strong> <a href={APP_URL}>{APP_URL}</a>
        </li>
      </ul>
    </article>
  );
}
