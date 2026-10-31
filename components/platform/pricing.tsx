import { ArrowRightIcon, CheckIcon, SparkleIcon } from "@phosphor-icons/react/ssr";
import { buttonClasses } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { PLANS, TWELVE_MONTHS_CENTS } from "@/lib/plans";

const INCLUDED = [
  "Site com a marca do seu studio",
  "Marcações online e pedidos no WhatsApp",
  "Agenda sem sobreposições",
  "Portfólio e moldes de cada cliente",
  "Estatísticas do site",
];

export function Pricing() {
  return (
    <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
      {PLANS.map((plan) => {
        const yearly = plan.id === "anual";
        return (
          <article
            key={plan.id}
            data-reveal
            className={`relative flex flex-col rounded-3xl p-6 shadow-soft sm:p-8 ${yearly ? "bg-ink text-cream" : "bg-surface"}`}
          >
            {yearly && (
              <span className="absolute -top-4 right-6 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffb3a5] to-[#ff7a64] px-4 py-2 text-sm font-bold text-ink shadow-lift ring-4 ring-cream">
                <SparkleIcon size={16} weight="fill" aria-hidden="true" />
                Económico
              </span>
            )}
            <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
            <p className="mt-3">
              <span className="font-display text-4xl font-bold tabular-nums">{formatPrice(plan.priceCents)}</span>
              <span className={yearly ? "text-cream/70" : "text-ink-muted"}> por {plan.period}</span>
            </p>
            {yearly ? (
              <p className="mt-1 text-sm font-semibold text-cream/70">
                <span className="sr-only">12 meses do plano mensal: </span>
                <s>{formatPrice(TWELVE_MONTHS_CENTS)}</s>
              </p>
            ) : (
              <p className="mt-1 text-sm font-semibold text-ink-muted">{formatPrice(TWELVE_MONTHS_CENTS)} por ano</p>
            )}
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckIcon size={20} weight="bold" aria-hidden="true" className={`mt-0.5 shrink-0 ${yearly ? "text-peach-200" : "text-accent"}`} />
                  {item}
                </li>
              ))}
            </ul>
            <a href={`/registo?plano=${plan.id}`} aria-label={`Quero fazer parte: plano ${plan.name}`} className={buttonClasses({ className: "mt-8 w-full" })}>
              Quero fazer parte
              <ArrowRightIcon size={18} aria-hidden="true" />
            </a>
          </article>
        );
      })}
    </div>
  );
}
