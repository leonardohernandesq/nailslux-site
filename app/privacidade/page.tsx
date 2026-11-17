import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/platform/legal-page";
import { PLATFORM } from "@/lib/site";

export const metadata: Metadata = { title: "Política de privacidade" };

// Written for the RGPD (Portugal and the EU) and the LGPD (Brazil, Lei 13.709/2018),
// since studios and their clients can be in either country.
const SECTIONS: LegalSection[] = [
  {
    title: "A quem se aplica",
    body: [
      `Esta política explica como o ${PLATFORM.name} trata dados pessoais: os dos studios que usam a plataforma e os das clientes que pedem marcações nos sites desses studios.`,
      "Aplica-se o Regulamento Geral sobre a Proteção de Dados (RGPD) a quem está em Portugal ou na União Europeia, e a Lei Geral de Proteção de Dados (LGPD, Lei n.º 13.709/2018) a quem está no Brasil.",
    ],
  },
  {
    title: "Quem trata os dados",
    body: [
      `O ${PLATFORM.name} é o responsável pelo tratamento (na LGPD, o controlador) dos dados das contas dos studios.`,
      `Cada studio é o responsável pelo tratamento (controlador) dos dados das suas clientes. Nesses dados, o ${PLATFORM.name} é apenas subcontratante (na LGPD, operador): guarda-os e mostra-os no painel do studio, por conta dele, para prestar o serviço.`,
    ],
  },
  {
    title: "Dados dos studios",
    body: [
      "Guardamos o nome do studio, o WhatsApp, o endereço e o horário, o nome e o email da pessoa responsável, e a palavra-passe protegida por hash.",
      "Usamos estes dados para criar e manter a conta, publicar o site e gerir a subscrição. A base legal é a execução do contrato (RGPD, art. 6.º, n.º 1, alínea b; LGPD, art. 7.º, inciso V) e, para a faturação, o cumprimento de obrigações legais.",
    ],
  },
  {
    id: "clientes",
    title: "Dados das clientes dos studios",
    body: [
      "Quando pede uma marcação, o seu nome, o seu WhatsApp, os serviços, a data, a hora e as observações que escrever são enviados ao studio que escolheu. Ficam guardados no painel desse studio e seguem também na mensagem de WhatsApp que envia ao studio.",
      `O studio é o responsável por estes dados: é ele que decide como os usa, por exemplo para confirmar a marcação ou falar consigo, e responde por essa utilização. O ${PLATFORM.name} não se responsabiliza pela forma como cada studio usa, guarda ou partilha os dados das suas clientes, dentro ou fora da plataforma.`,
      `Dentro da plataforma, estes dados só servem para gerir as marcações do studio e nunca são partilhados com outros studios. O ${PLATFORM.name} não os usa para fins próprios, como publicidade.`,
      "O studio pode ainda guardar notas sobre si no painel. Para saber o que guarda ou pedir que apague os seus dados, fale diretamente com o studio.",
    ],
  },
  {
    title: "Pagamentos",
    body: ["Os pagamentos das subscrições são feitos na Stripe. Os dados do cartão não passam pelos nossos servidores."],
  },
  {
    title: "Estatísticas e cookies",
    body: [
      "As estatísticas dos sites são anónimas: não guardam nomes, IPs nem cookies, e o identificador de cada visita muda todos os dias.",
      "Também usamos o Vercel Web Analytics para medir as visitas às páginas públicas, da mesma forma: sem cookies e sem identificar quem visita.",
      "Usamos um cookie apenas para manter a sessão de quem entra no painel. Este cookie é necessário para o serviço funcionar e não precisa de consentimento.",
    ],
  },
  {
    title: "Com quem partilhamos",
    body: [
      "Recorremos a prestadores que nos ajudam a operar o serviço: Vercel (alojamento), MongoDB (base de dados), Stripe (pagamentos) e, quando ativo, Resend (envio de emails). A mensagem de marcação é enviada pelo WhatsApp (Meta), de acordo com as regras desse serviço.",
      "Alguns destes prestadores tratam dados fora da União Europeia e do Brasil. Nesses casos, a transferência é feita com garantias adequadas, como cláusulas contratuais-padrão (RGPD, art. 46.º; LGPD, art. 33).",
      "Não vendemos dados pessoais.",
    ],
  },
  {
    title: "Segurança",
    body: [
      "Usamos ligações cifradas (HTTPS), palavras-passe protegidas por hash e acesso restrito: cada studio só vê os dados do seu painel.",
      "Se houver um incidente de segurança que possa trazer risco para as pessoas, avisamos os afetados e as autoridades competentes, como a lei exige.",
    ],
  },
  {
    title: "Conservação",
    body: [
      "Guardamos os dados enquanto a conta do studio estiver ativa e durante o período necessário para cumprir obrigações legais. Depois disso, são apagados ou anonimizados.",
    ],
  },
  {
    title: "Os seus direitos",
    body: [
      "Pelo RGPD, pode pedir acesso, correção, apagamento, limitação ou portabilidade dos seus dados, e opor-se ao seu tratamento.",
      "Pela LGPD (art. 18), pode pedir a confirmação de que tratamos os seus dados, o acesso, a correção, a anonimização, o bloqueio ou a eliminação, a portabilidade, a informação sobre com quem os partilhamos e, quando o tratamento depender do seu consentimento, revogá-lo.",
      "Se for cliente de um studio, faça o pedido a esse studio, que é o responsável pelos seus dados. Se o pedido nos chegar, encaminhamo-lo para o studio.",
      "Pode também apresentar queixa à Comissão Nacional de Proteção de Dados (CNPD), em Portugal, ou à Autoridade Nacional de Proteção de Dados (ANPD), no Brasil.",
    ],
  },
  {
    title: "Encarregado de proteção de dados",
    body: [
      `Os pedidos sobre dados pessoais, incluindo os dirigidos ao encarregado de proteção de dados (DPO), são feitos por email para ${PLATFORM.contactEmail}.`,
    ],
  },
];

export default function PrivacyPage() {
  return <LegalPage title="Política de privacidade" sections={SECTIONS} />;
}
