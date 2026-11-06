"use client";

import { useActionState, useState } from "react";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { SubmitButton } from "@/components/admin/submit-button";
import { Field, Input, Select, describedBy } from "@/components/ui/field";
import { idleState } from "@/lib/actions/form-state";
import { grantStudioTime } from "@/lib/actions/platform";
import { PLANS } from "@/lib/plans";
import { GRANT_LIMITS } from "@/lib/validation/grant";

/**
 * The platform admin gives a studio free time. `extends` says whether there's a
 * paying subscription to push back (otherwise a free one starts, on `plan`).
 */
export function GrantTime({ studioId, extendsSubscription }: { studioId: string; extendsSubscription: boolean }) {
  const [state, formAction] = useActionState(grantStudioTime.bind(null, studioId), idleState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const [unit, setUnit] = useState<"days" | "months">((v?.unit as "days" | "months") ?? "months");

  return (
    <form key={state.status === "success" ? state.message : "form"} action={formAction} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">
        {extendsSubscription
          ? "A próxima cobrança passa este tempo para a frente. O que já foi pago mantém-se."
          : "Começa uma subscrição grátis até à data. Se o studio não puser um cartão até lá, termina sozinha e o site é suspenso."}
      </p>
      {state.status === "error" && state.message && (
        <p role="alert" className="flex items-center gap-2 rounded-2xl border border-danger/25 bg-danger-soft p-4 text-sm font-semibold text-danger">
          <WarningCircleIcon size={20} weight="bold" aria-hidden="true" />
          {state.message}
        </p>
      )}
      {state.status === "success" && (
        <p role="status" className="flex items-center gap-2 rounded-2xl border border-success/25 bg-success-soft p-4 text-sm font-semibold text-success">
          <CheckCircleIcon size={20} weight="fill" aria-hidden="true" />
          {state.message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr_1fr]">
        <Field id="grant-amount" label="Quanto" required errors={errors.amount}>
          <Input
            id="grant-amount"
            name="amount"
            type="number"
            inputMode="numeric"
            min={1}
            max={GRANT_LIMITS[unit]}
            required
            defaultValue={v?.amount ?? "1"}
            {...describedBy("grant-amount", errors.amount)}
          />
        </Field>
        <Field id="grant-unit" label="Unidade" required errors={errors.unit}>
          <Select id="grant-unit" name="unit" value={unit} onChange={(event) => setUnit(event.target.value as "days" | "months")}>
            <option value="days">Dias</option>
            <option value="months">Meses</option>
          </Select>
        </Field>
        {!extendsSubscription && (
          <Field id="grant-plan" label="Plano depois" errors={errors.plan}>
            <Select id="grant-plan" name="plan" defaultValue={v?.plan ?? "mensal"}>
              {PLANS.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="A aplicar…">Oferecer tempo</SubmitButton>
      </div>
    </form>
  );
}
