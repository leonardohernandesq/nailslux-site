import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/platform/legal-page";
import { formatPrice } from "@/lib/format";
import { PLANS } from "@/lib/plans";
import { PLATFORM } from "@/lib/site";

export const metadata: Metadata = { title: "Termos de utilização" };

const PRICES = PLANS.map((plan) => `${plan.name}: ${formatPrice(plan.priceCents)} por ${plan.period}`).join("; ");

const SECTIONS: LegalSection[] = [
  {
    title: "O serviço",
    body: [
      `O ${PLATFORM.name} é uma plataforma para studios de unhas. Inclui um site público para o studio, pedidos de marcação enviados pelo WhatsApp e um painel para gerir serviços, agenda, clientes e portfólio.`,
      "O serviço destina-se a profissionais e negócios, e não a uso pessoal.",
    ],
  },
  {
    title: "A sua conta",
    body: [
      "Deve indicar dados verdadeiros e manter a sua palavra-passe em segurança. É responsável pelo que for feito com a sua conta.",
      "É também responsável pelos conteúdos que publica no site do studio, incluindo textos, preços e fotografias, e por ter autorização para os usar.",
      `O nome, a frase, o logo e o banner de um site público podem ser mostrados na página do ${PLATFORM.name}, com ligação para esse site. Se preferir que o seu studio não apareça, contacte-nos.`,
    ],
  },
  {
    title: "Planos e pagamento",
    body: [
      `Planos disponíveis: ${PRICES}.`,
      "A subscrição é paga através da Stripe e renova-se automaticamente no fim de cada período, até ser cancelada. O site do studio é publicado depois de confirmado o pagamento.",
      "Se o pagamento falhar, tentaremos cobrar novamente. Se a subscrição terminar por falta de pagamento, o site fica suspenso até a situação ser regularizada.",
    ],
  },
  {
    title: "Cancelamento",
    body: [
      "Pode cancelar a subscrição na área Subscrição do painel. O acesso mantém-se até ao fim do período já pago. Depois disso, o site do studio deixa de estar disponível.",
    ],
  },
  {
    title: "Suspensão",
    body: [
      "Podemos suspender um site que viole estes termos ou a lei, ou que coloque em risco a plataforma ou outras pessoas.",
    ],
  },
  {
    title: "Disponibilidade e responsabilidade",
    body: [
      "Procuramos manter o serviço disponível, mas podem ocorrer interrupções. Os pedidos de marcação são confirmados pelo próprio studio, que é responsável pelos serviços que presta às suas clientes.",
    ],
  },
  {
    title: "Alterações",
    body: ["Podemos atualizar estes termos e os preços. As alterações relevantes serão comunicadas antes de entrarem em vigor."],
  },
  {
    title: "Lei aplicável",
    body: ["Estes termos regem-se pela lei portuguesa."],
  },
];

export default function TermsPage() {
  return <LegalPage title="Termos de utilização" sections={SECTIONS} />;
}
