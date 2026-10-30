import { formatPrice } from "@/lib/format";
import { PLANS, YEARLY_SAVING_CENTS, type PlanId } from "@/lib/plans";

/** Radio buttons named "plan", for forms that lead to the payment page. */
export function PlanPicker({ defaultPlan = "mensal" }: { defaultPlan?: PlanId }) {
  return (
    <fieldset>
      <legend className="mb-2 font-semibold">Plano</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {PLANS.map((plan) => (
          <label
            key={plan.id}
            className="flex cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1 ring-line transition-colors has-checked:bg-peach-50 has-checked:ring-2 has-checked:ring-accent"
          >
            <input type="radio" name="plan" value={plan.id} defaultChecked={plan.id === defaultPlan} className="mt-1 size-5 shrink-0 accent-accent" />
            <span>
              <span className="block font-bold">{plan.name}</span>
              <span className="block text-sm text-ink-muted">
                {formatPrice(plan.priceCents)} por {plan.period}
              </span>
              {plan.id === "anual" && <span className="block text-sm font-semibold text-accent">Poupa {formatPrice(YEARLY_SAVING_CENTS)}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
