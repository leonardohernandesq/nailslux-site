"use client";

import { useActionState } from "react";
import { CheckCircleIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { Field, Input, describedBy } from "@/components/ui/field";
import { updateSettings } from "@/lib/actions/settings";
import { idleState } from "@/lib/actions/form-state";
import type { TenantDTO } from "@/lib/data/tenants";
import { formatPhone } from "@/lib/phone";
import { DAY_NAMES, DEFAULT_DAY_TIMES, WEEK } from "@/lib/site";
import { SubmitButton } from "./submit-button";

/** `studioId` is set when the platform admin edits a studio from the backoffice. */
export function SettingsForm({ tenant, studioId }: { tenant: TenantDTO; studioId?: string }) {
  const [state, formAction] = useActionState(updateSettings, idleState);
  const errors = state.fieldErrors ?? {};
  const v = state.values;

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6 rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
      {studioId && <input type="hidden" name="studioId" value={studioId} />}
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

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="name" label="Nome do studio" required errors={errors.name}>
          <Input id="name" name="name" required maxLength={80} defaultValue={v?.name ?? tenant.name} {...describedBy("name", errors.name)} />
        </Field>
        <Field id="tagline" label="Frase curta" required errors={errors.tagline} hint="Ex.: Studio de unhas em Lisboa">
          <Input id="tagline" name="tagline" required maxLength={80} defaultValue={v?.tagline ?? tenant.tagline} {...describedBy("tagline", errors.tagline, "hint")} />
        </Field>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id="whatsappNumber" label="WhatsApp" required errors={errors.whatsappNumber}>
          <Input
            id="whatsappNumber"
            name="whatsappNumber"
            type="tel"
            required
            defaultValue={v?.whatsappNumber ?? formatPhone(tenant.whatsappNumber)}
            {...describedBy("whatsappNumber", errors.whatsappNumber)}
          />
        </Field>
        <Field id="instagramUrl" label="Instagram" errors={errors.instagramUrl}>
          <Input
            id="instagramUrl"
            name="instagramUrl"
            type="url"
            placeholder="https://www.instagram.com/o.seu.studio/"
            defaultValue={v?.instagramUrl ?? tenant.instagramUrl ?? ""}
            {...describedBy("instagramUrl", errors.instagramUrl)}
          />
        </Field>
      </div>

      <Field id="address" label="Morada" errors={errors.address}>
        <Input id="address" name="address" maxLength={200} defaultValue={v?.address ?? tenant.address ?? ""} {...describedBy("address", errors.address)} />
      </Field>

      <fieldset>
        <legend className="text-sm font-semibold">Horário de cada dia</legend>
        <p className="mt-1 text-sm text-ink-muted">Marque os dias em que abre e indique a primeira e a última marcação.</p>
        <div className="mt-3 flex flex-col gap-2">
          {WEEK.map((day) => {
            const saved = tenant.hours.days.find((entry) => entry.day === day);
            const times = saved ?? DEFAULT_DAY_TIMES;
            const name = DAY_NAMES[day];
            return (
              <div key={day} className="group flex min-h-14 flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-line px-4 py-2 has-[input[type=checkbox]:checked]:border-accent has-[input[type=checkbox]:checked]:bg-peach-50">
                <label className="flex min-h-11 w-28 cursor-pointer items-center gap-2">
                  <input type="checkbox" name={`open-${day}`} defaultChecked={v ? `open-${day}` in v : Boolean(saved)} className="size-4 accent-accent" />
                  <span className="text-sm font-semibold capitalize">{name}</span>
                </label>
                <div className="hidden flex-1 items-center gap-2 group-has-[input[type=checkbox]:checked]:flex">
                  <Input aria-label={`Primeira marcação de ${name}`} name={`opens-${day}`} type="time" step={1800} defaultValue={v?.[`opens-${day}`] ?? times.opens} className="min-w-0" />
                  <span className="text-sm text-ink-muted">até</span>
                  <Input aria-label={`Última marcação de ${name}`} name={`lastStart-${day}`} type="time" step={1800} defaultValue={v?.[`lastStart-${day}`] ?? times.lastStart} className="min-w-0" />
                </div>
                <span className="text-sm text-ink-muted group-has-[input[type=checkbox]:checked]:hidden">Fechado</span>
              </div>
            );
          })}
        </div>
        {errors.days && <p className="mt-1.5 text-sm font-semibold text-danger">{errors.days[0]}</p>}
      </fieldset>

      <div className="flex justify-end">
        <SubmitButton pendingLabel="A guardar…">Guardar definições</SubmitButton>
      </div>
    </form>
  );
}
