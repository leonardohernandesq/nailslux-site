import { ArrowRightIcon, CheckIcon } from "@phosphor-icons/react/ssr";
import { buttonClasses } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import { PLANS, YEARLY_SAVING_CENTS, type Plan } from "@/lib/plans";

const INCLUDED = [
  "Site com a marca do seu studio",
  "Marcações online e pedidos no WhatsApp",
  "Agenda sem sobreposições",
  "Portfólio e moldes de cada cliente",
  "Estatísticas do site",
];

/** `ctaFor` decides where each plan leads: sign-up with it chosen, or contact while closed. */
export function Pricing({ ctaFor }: { ctaFor: (plan: Plan) => { href: string; label: string } }) {
  return (
    <div className="mx-auto grid max-w-3xl gap-5 md:grid-cols-2">
      {PLANS.map((plan) => {
        const cta = ctaFor(plan);
        const yearly = plan.id === "anual";
        return (
          <article
            key={plan.id}
            data-reveal
            className={`relative flex flex-col rounded-3xl p-6 shadow-soft sm:p-8 ${yearly ? "bg-ink text-cream" : "bg-surface"}`}
          >
            <h3 className="font-display text-2xl font-bold">{plan.name}</h3>
            <p className="mt-3">
              <span className="font-display text-4xl font-bold tabular-nums">{formatPrice(plan.priceCents)}</span>
              <span className={yearly ? "text-cream/70" : "text-ink-muted"}> por {plan.period}</span>
            </p>
            <p className={`mt-1 min-h-6 text-sm font-semibold ${yearly ? "text-peach-200" : "text-ink-muted"}`}>
              {yearly ? `Poupa ${formatPrice(YEARLY_SAVING_CENTS)} por ano` : "Cancele quando quiser"}
            </p>
            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {INCLUDED.map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckIcon size={20} weight="bold" aria-hidden="true" className={`mt-0.5 shrink-0 ${yearly ? "text-peach-200" : "text-accent"}`} />
                  {item}
                </li>
              ))}
            </ul>
            <a href={cta.href} aria-label={`${cta.label}: plano ${plan.name}`} className={buttonClasses({ className: "mt-8 w-full" })}>
              {cta.label}
              <ArrowRightIcon size={18} aria-hidden="true" />
            </a>
          </article>
        );
      })}
    </div>
  );
}
