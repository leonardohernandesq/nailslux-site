"use client";

import { useActionState, useId } from "react";
import { saveClientMolds } from "@/lib/actions/clients";
import { idleState } from "@/lib/actions/form-state";
import type { ClientMolds } from "@/lib/data/appointments";
import { Field, Input, describedBy } from "@/components/ui/field";
import { SubmitButton } from "./submit-button";

/** Hand and foot mold numbers, saved on the client's WhatsApp number. */
export function ClientMoldsForm({ appointmentId, molds }: { appointmentId: string; molds: ClientMolds }) {
  const [state, formAction] = useActionState(saveClientMolds.bind(null, appointmentId), idleState);
  const uid = useId();
  const ids = { hand: `${uid}-hand`, foot: `${uid}-foot` };
  const values = state.values ?? molds;
  const errors = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id={ids.hand} label="Molde da mão" errors={errors.handMold}>
          <Input
            id={ids.hand}
            name="handMold"
            maxLength={40}
            defaultValue={values.handMold}
            {...describedBy(ids.hand, errors.handMold)}
          />
        </Field>
        <Field id={ids.foot} label="Molde do pé" errors={errors.footMold}>
          <Input
            id={ids.foot}
            name="footMold"
            maxLength={40}
            defaultValue={values.footMold}
            {...describedBy(ids.foot, errors.footMold)}
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingLabel="A guardar…">Guardar moldes</SubmitButton>
        <p
          aria-live="polite"
          className={`text-sm font-semibold ${state.status === "error" ? "text-danger" : "text-success"}`}
        >
          {state.message}
        </p>
      </div>
    </form>
  );
}
