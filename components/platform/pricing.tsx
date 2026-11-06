import { ArrowRightIcon, CheckIcon, SparkleIcon } from "@phosphor-icons/react/ssr";
import { buttonClasses } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { PLANS, TWELVE_MONTHS_CENTS } from "@/lib/plans";

const INCLUDED = [
  "Site com a marca do seu studio",
  "Marcações online e pedidos no WhatsApp",
  "Agenda sem sobreposições",
  "Ficha e histórico de cada cliente",
  "Agenda no calendário do telemóvel",
  "Aviso de cada pedido por email",
  "Portfólio e estatísticas do site",
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
            data-tilt="4"
            className={`relative flex flex-col rounded-3xl p-6 sm:p-8 ${
              yearly ? "gold-ring grain bg-ink text-cream shadow-lift" : "bg-surface shadow-soft ring-1 ring-line"
            }`}
          >
            {yearly && (
              <span className="absolute -top-4 right-6 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#ffb3a5] to-[#ff7a64] px-4 py-2 text-sm font-bold text-ink shadow-lift ring-4 ring-cream">
                <SparkleIcon size={16} weight="fill" aria-hidden="true" />
                Económico
              </span>
            )}
            <h3 className="font-luxe text-3xl italic">{plan.name}</h3>
            <p className="mt-3">
              <span className="font-display text-4xl font-bold tabular-nums">{formatPrice(plan.priceCents)}</span>
              <span className={yearly ? "text-cream/70" : "text-ink-muted"}> por {plan.period} + IVA</span>
            </p>
            {yearly ? (
              <p className="mt-1 text-sm font-semibold text-cream/70">
                <span className="sr-only">12 meses do plano mensal: </span>
                <s>{formatPrice(TWELVE_MONTHS_CENTS)}</s>
              </p>
            ) : (
              <p className="mt-1 text-sm font-semibold text-ink-muted">{formatPrice(TWELVE_MONTHS_CENTS)} por ano + IVA</p>
            )}
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckIcon size={20} weight="bold" aria-hidden="true" className={`mt-0.5 shrink-0 ${yearly ? "text-gold" : "text-accent"}`} />
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
