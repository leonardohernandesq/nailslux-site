"use client";

import { useActionState, useState } from "react";
import { AirplaneTiltIcon, CheckCircleIcon, TrashIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Field, Input, describedBy } from "@/components/ui/field";
import { idleState } from "@/lib/actions/form-state";
import { addTimeOff, removeTimeOff } from "@/lib/actions/time-off";
import { formatLongDate } from "@/lib/format";
import type { TimeOff } from "@/lib/site";
import { IconSubmitButton, SubmitButton } from "./submit-button";

function describe(off: TimeOff): string {
  const days = off.start === off.end ? formatLongDate(off.start) : `${formatLongDate(off.start)} a ${formatLongDate(off.end)}`;
  return off.from && off.to ? `${days}, das ${off.from} às ${off.to}` : days;
}

/** Days and hours off, on top of the weekly hours. */
export function TimeOffManager({ timeOff, today }: { timeOff: TimeOff[]; today: string }) {
  const [state, formAction] = useActionState(addTimeOff, idleState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;
  const [span, setSpan] = useState(v?.span ?? "day");
  const [start, setStart] = useState(v?.start ?? "");

  return (
    <section aria-labelledby="time-off-title" className="mt-6 flex flex-col gap-5 rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
      <div>
        <h2 id="time-off-title" className="flex items-center gap-2 font-display text-2xl font-semibold">
          <AirplaneTiltIcon size={24} aria-hidden="true" />
          Folgas e férias
        </h2>
        <p className="mt-1 text-sm text-ink-muted">
          Feche dias inteiros ou só algumas horas. O site deixa logo de oferecer esses horários.
        </p>
      </div>

      {timeOff.length > 0 && (
        <ul aria-label="Folgas marcadas" className="flex flex-col gap-2">
          {timeOff.map((off) => (
            <li key={off.id} className="flex items-center justify-between gap-3 rounded-2xl bg-peach-50 py-2 pr-2 pl-4">
              <div className="min-w-0">
                <p className="font-semibold first-letter:uppercase">{describe(off)}</p>
                {off.note && <p className="text-sm text-ink-muted wrap-anywhere">{off.note}</p>}
              </div>
              <form action={removeTimeOff.bind(null, off.id)}>
                <IconSubmitButton label={`Apagar folga: ${describe(off)}`} tone="danger">
                  <TrashIcon size={20} aria-hidden="true" />
                </IconSubmitButton>
              </form>
            </li>
          ))}
        </ul>
      )}

      {/* Remounts after a save, so the fields empty for the next one. */}
      <form key={state.status === "success" ? state.message : "form"} action={formAction} noValidate className="flex flex-col gap-4">
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

        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="off-start" label="De" required errors={errors.start}>
            <Input
              id="off-start"
              name="start"
              type="date"
              min={today}
              required
              defaultValue={v?.start}
              onChange={(event) => setStart(event.target.value)}
              {...describedBy("off-start", errors.start)}
            />
          </Field>
          <Field id="off-end" label="Até" errors={errors.end} hint="Deixe vazio se for só um dia.">
            <Input id="off-end" name="end" type="date" min={start || today} defaultValue={v?.end} {...describedBy("off-end", errors.end, "hint")} />
          </Field>
        </div>

        <fieldset>
          <legend className="text-sm font-semibold">Fecha</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { value: "day", label: "O dia inteiro" },
              { value: "hours", label: "Só algumas horas" },
            ].map((option) => (
              <label
                key={option.value}
                className="flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-line px-4 has-checked:border-accent has-checked:bg-peach-50"
              >
                <input
                  type="radio"
                  name="span"
                  value={option.value}
                  checked={span === option.value}
                  onChange={() => setSpan(option.value)}
                  className="size-4 accent-accent"
                />
                <span className="text-sm font-semibold">{option.label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {span === "hours" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field id="off-from" label="Das" required errors={errors.from}>
              <Input id="off-from" name="from" type="time" step={1800} required defaultValue={v?.from} {...describedBy("off-from", errors.from)} />
            </Field>
            <Field id="off-to" label="Às" required errors={errors.to}>
              <Input id="off-to" name="to" type="time" step={1800} required defaultValue={v?.to} {...describedBy("off-to", errors.to)} />
            </Field>
          </div>
        )}

        <Field id="off-note" label="Nota" errors={errors.note} hint="Só para si, ex.: Férias, Formação.">
          <Input id="off-note" name="note" maxLength={80} defaultValue={v?.note} {...describedBy("off-note", errors.note, "hint")} />
        </Field>

        <div className="flex justify-end">
          <SubmitButton pendingLabel="A guardar…">Guardar folga</SubmitButton>
        </div>
      </form>
    </section>
  );
}
