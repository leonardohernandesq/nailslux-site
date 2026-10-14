"use client";

import { useActionState } from "react";
import { saveClientMolds } from "@/lib/actions/clients";
import { idleState } from "@/lib/actions/form-state";
import type { ClientMolds } from "@/lib/data/appointments";
import { MoldInput } from "./mold-input";
import { SubmitButton } from "./submit-button";

const HAND = ["Polegar", "Indicador", "Médio", "Anelar", "Mindinho"] as const;
const FOOT = ["Dedão", "2.º dedo", "3.º dedo", "4.º dedo", "Mindinho"] as const;

/** Hand and foot mold sizes, saved on the client's WhatsApp number. */
export function ClientMoldsForm({ appointmentId, molds }: { appointmentId: string; molds: ClientMolds }) {
  const [state, formAction] = useActionState(saveClientMolds.bind(null, appointmentId), idleState);
  const values = state.values ?? molds;
  const errors = state.fieldErrors ?? {};

  return (
    // Remount after each save so the boxes show what was stored.
    <form key={`${molds.handMold}|${molds.footMold}`} action={formAction} className="flex flex-col gap-4">
      <p className="text-sm text-ink-muted">
        Um número por dedo. Deixe vazio se ainda não souber.
      </p>
      <div className="grid max-w-2xl gap-x-8 gap-y-4 sm:grid-cols-2">
        <MoldInput
          name="handMold"
          label="Molde da mão"
          fingers={HAND}
          defaultValue={values.handMold}
          errors={errors.handMold}
        />
        <MoldInput
          name="footMold"
          label="Molde do pé"
          fingers={FOOT}
          defaultValue={values.footMold}
          errors={errors.footMold}
        />
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
