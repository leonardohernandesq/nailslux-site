import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/platform/legal-page";
import { PLATFORM } from "@/lib/site";

export const metadata: Metadata = { title: "Política de privacidade" };

const SECTIONS: LegalSection[] = [
  {
    title: "Quem trata os dados",
    body: [
      `O ${PLATFORM.name} é responsável pelos dados das contas dos studios.`,
      "Cada studio é responsável pelos dados das suas clientes. Nesse caso, o Nailo App trata esses dados apenas por conta do studio, para prestar o serviço.",
    ],
  },
  {
    title: "Dados dos studios",
    body: [
      "Guardamos o nome do studio, o WhatsApp, o endereço e o horário, o nome e o email da pessoa responsável, e a palavra-passe protegida por hash.",
      "Usamos estes dados para criar e manter a conta, publicar o site e gerir a subscrição. A base legal é a execução do contrato.",
    ],
  },
  {
    title: "Dados das clientes dos studios",
    body: [
      "Quando uma cliente pede uma marcação, guardamos os dados do pedido, como o nome, o WhatsApp, o serviço e a data. O studio pode ainda guardar notas sobre a cliente no painel.",
      "Estes dados só são usados para gerir as marcações do studio e não são partilhados com outros studios.",
    ],
  },
  {
    title: "Pagamentos",
    body: ["Os pagamentos são feitos na Stripe. Os dados do cartão não passam pelos nossos servidores."],
  },
  {
    title: "Estatísticas e cookies",
    body: [
      "As estatísticas dos sites são anónimas: não guardam nomes, IPs nem cookies, e o identificador de cada visita muda todos os dias.",
      "Usamos um cookie apenas para manter a sessão de quem entra no painel.",
    ],
  },
  {
    title: "Com quem partilhamos",
    body: [
      "Recorremos a prestadores que nos ajudam a operar o serviço: Vercel (alojamento), MongoDB (base de dados), Stripe (pagamentos) e, quando ativo, Resend (envio de emails). Alguns podem tratar dados fora da União Europeia.",
      "Não vendemos dados pessoais.",
    ],
  },
  {
    title: "Conservação",
    body: ["Guardamos os dados enquanto a conta estiver ativa e durante o período necessário para cumprir obrigações legais."],
  },
  {
    title: "Os seus direitos",
    body: [
      "Pode pedir acesso, correção, apagamento, limitação ou portabilidade dos seus dados, e opor-se ao seu tratamento. Se for cliente de um studio, dirija o pedido primeiro a esse studio.",
      "Pode também apresentar queixa à Comissão Nacional de Proteção de Dados (CNPD).",
    ],
  },
];

export default function PrivacyPage() {
  return <LegalPage title="Política de privacidade" sections={SECTIONS} />;
}
