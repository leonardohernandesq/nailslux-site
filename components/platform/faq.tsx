import { PlusIcon } from "@phosphor-icons/react/ssr";
import { PORTFOLIO_MAX_ITEMS } from "@/lib/constants";
import { PLATFORM } from "@/lib/site";

// Answers must match the terms (app/termos) and how the product works today.
const QUESTIONS = [
  {
    question: "Preciso de comprar um domínio?",
    answer: `Não. O seu site fica num endereço do ${PLATFORM.name} com o nome do seu studio, pronto a pôr na bio do Instagram.`,
  },
  {
    question: "As minhas clientes pagam alguma coisa?",
    answer: `Não. As clientes marcam sem custos e pagam o serviço no studio, como sempre. O ${PLATFORM.name} só cobra a subscrição ao studio.`,
  },
  {
    question: "Como chegam os pedidos de marcação?",
    answer:
      "A cliente escolhe o serviço, o dia e a hora, e o site abre o WhatsApp com a mensagem já escrita. Depois, confirma ou recusa o pedido no painel.",
  },
  {
    question: "Posso alterar os serviços e as fotografias?",
    answer: `Sim, sempre que quiser. No painel muda serviços, preços, durações, horários e até ${PORTFOLIO_MAX_ITEMS} fotografias, e o site atualiza na hora.`,
  },
  {
    question: "Como funciona o mês grátis por indicação?",
    answer:
      "No painel tem um link para partilhar. Quando outro studio cria conta por esse link e ativa a subscrição, a próxima cobrança de cada um passa um mês para a frente. Se indicar três studios, ganha três meses.",
  },
  {
    question: "Posso cancelar quando quiser?",
    answer: "Sim. Cancela na área Subscrição do painel e o acesso mantém-se até ao fim do período já pago.",
  },
  {
    question: "Os preços incluem IVA?",
    answer: "Não. Os preços apresentados não incluem IVA, que é acrescentado ao valor.",
  },
];

/** Native <details>: works without JS, and opens smoothly where the browser allows (globals.css). */
export function Faq() {
  return (
    <ul data-reveal-group className="mx-auto flex max-w-3xl flex-col gap-3">
      {QUESTIONS.map(({ question, answer }) => (
        <li key={question}>
          <details className="faq-item group rounded-3xl bg-surface shadow-soft ring-1 ring-line transition-shadow duration-300 open:shadow-lift">
            <summary className="flex min-h-16 items-center justify-between gap-4 px-6 py-4 text-lg font-bold [&::-webkit-details-marker]:hidden">
              {question}
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-peach-50 text-accent transition-[rotate,background-color,color] duration-300 ease-(--ease-out-soft) group-open:rotate-45 group-open:bg-ink group-open:text-gold">
                <PlusIcon size={18} weight="bold" aria-hidden="true" />
              </span>
            </summary>
            <p className="px-6 pb-6 text-ink-muted">{answer}</p>
          </details>
        </li>
      ))}
    </ul>
  );
}
