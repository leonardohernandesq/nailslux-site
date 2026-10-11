"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  ClockIcon,
  WarningCircleIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Textarea, describedBy } from "@/components/ui/field";
import { formatDuration, formatPrice } from "@/lib/format";
import { dateBounds, slotsFor } from "@/lib/schedule";
import { formatOpeningDays, type OpeningHours } from "@/lib/site";
import { createBookingSchema } from "@/lib/validation/booking";
import { buildBookingMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { useBooking } from "./booking-context";
import { useNow } from "./use-now";

type Errors = Partial<Record<"name" | "serviceIds" | "date" | "time" | "notes", string[]>>;

const FIELD_LABELS: Record<keyof Errors, string> = {
  serviceIds: "Serviços",
  date: "Data",
  time: "Hora",
  name: "Nome",
  notes: "Observações",
};

export function BookingForm({
  whatsappNumber,
  hours,
}: {
  whatsappNumber: string;
  hours: OpeningHours;
}) {
  const { services, selectedIds, toggle } = useBooking();
  const now = useNow();
  const uid = useId();
  const ids = {
    services: `${uid}-services`,
    date: `${uid}-date`,
    time: `${uid}-time`,
    name: `${uid}-name`,
    notes: `${uid}-notes`,
  };

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [sentUrl, setSentUrl] = useState<string | null>(null);
  const [failedSubmits, setFailedSubmits] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Move focus to the error summary after each failed submit.
  useEffect(() => {
    if (failedSubmits > 0) summaryRef.current?.focus();
  }, [failedSubmits]);

  const values = { name, serviceIds: selectedIds, date, time, notes };

  function validate(at: Date) {
    const schema = createBookingSchema({ serviceIds: services.map((s) => s.id), hours, now: at });
    return schema.safeParse(values);
  }

  // After the first submit attempt, errors update live as the client fixes them.
  const errors: Errors = {};
  if (attempted && now) {
    const result = validate(now);
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = issue.path[0] as keyof Errors;
        (errors[key] ??= []).push(issue.message);
      }
    }
  }
  const errorKeys = (Object.keys(FIELD_LABELS) as (keyof Errors)[]).filter((k) => errors[k]?.length);

  const bounds = now ? dateBounds(hours, now) : null;
  const slots = date && now ? slotsFor(date, hours, now) : [];
  const chosen = services.filter((service) => selectedIds.includes(service.id));
  const total = chosen.reduce((sum, service) => sum + service.priceCents, 0);
  const totalMinutes = chosen.reduce((sum, service) => sum + (service.durationMinutes ?? 0), 0);

  function onDateChange(value: string) {
    setDate(value);
    // Keep the chosen time only if it's still offered on the new date.
    if (now && time && !slotsFor(value, hours, now).includes(time)) setTime("");
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAttempted(true);
    setSentUrl(null);

    const result = validate(new Date());
    if (!result.success) {
      setFailedSubmits((n) => n + 1);
      return;
    }

    const url = buildWhatsAppUrl(whatsappNumber, buildBookingMessage(result.data, services));
    const popup = window.open(url, "_blank");
    if (popup) popup.opener = null;
    else window.location.href = url; // popup blocked: open in the same tab
    setSentUrl(url);
  }

  if (services.length === 0) {
    return (
      <div className="rounded-3xl bg-surface p-6 text-center shadow-soft sm:p-10">
        <p className="text-lg">Os serviços vão ser publicados em breve.</p>
        <p className="mt-2 text-ink-muted">Entretanto, fale connosco diretamente:</p>
        <a
          href={buildWhatsAppUrl(whatsappNumber, "Olá, NailsLux! Gostaria de fazer uma marcação.")}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex min-h-12 items-center gap-2 rounded-full bg-accent px-6 font-semibold text-on-accent hover:bg-accent-hover"
        >
          <WhatsappLogoIcon size={22} weight="fill" aria-hidden="true" />
          Falar pelo WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      aria-label="Pedido de marcação"
      className="grid gap-8 rounded-3xl bg-surface p-5 shadow-soft sm:p-8 lg:grid-cols-[1.15fr_1fr] lg:gap-10 lg:p-10 *:min-w-0"
    >
      {errorKeys.length > 0 && (
        <div
          ref={summaryRef}
          tabIndex={-1}
          role="alert"
          className="rounded-2xl border border-danger/25 bg-danger-soft p-4 text-danger lg:col-span-2"
        >
          <p className="flex items-center gap-2 font-bold">
            <WarningCircleIcon size={20} weight="bold" aria-hidden="true" />
            Falta pouco! Reveja estes campos:
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-9 text-sm">
            {errorKeys.map((key) => (
              <li key={key}>
                <a
                  className="underline underline-offset-2"
                  href={`#${key === "serviceIds" ? `${ids.services}-0` : key === "time" ? ids.time : ids[key]}`}
                >
                  {FIELD_LABELS[key]}: {errors[key]![0]}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Services */}
      <fieldset aria-describedby={errors.serviceIds ? `${ids.services}-error` : undefined}>
        <legend className="font-display text-2xl font-semibold">1. Escolha o serviço</legend>
        <p className="mt-1 text-sm text-ink-muted">Pode escolher mais do que um.</p>
        <ul className="mt-4 grid gap-3">
          {services.map((service, index) => {
            const checked = selectedIds.includes(service.id);
            const inputId = `${ids.services}-${index}`;
            return (
              <li key={service.id}>
                <label
                  htmlFor={inputId}
                  className={`flex min-h-14 cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 transition-colors duration-150 has-focus-visible:ring-4 has-focus-visible:ring-accent/20 ${
                    checked ? "border-accent bg-peach-50" : "border-line hover:border-line-strong"
                  }`}
                >
                  <input
                    id={inputId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(service.id)}
                    className="size-5 shrink-0 accent-accent"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold">{service.name}</span>
                    {service.durationMinutes ? (
                      <span className="block text-sm text-ink-muted">
                        {formatDuration(service.durationMinutes)}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-bold tabular-nums">{formatPrice(service.priceCents)}</span>
                </label>
              </li>
            );
          })}
        </ul>
        <div className="mt-2">
          <FieldError id={`${ids.services}-error`} errors={errors.serviceIds} />
        </div>
      </fieldset>

      <div className="flex flex-col gap-6">
        <h3 className="font-display text-2xl font-semibold">2. Data, hora e nome</h3>

        <Field
          id={ids.date}
          label="Data"
          required
          errors={errors.date}
          hint={`O studio abre de ${formatOpeningDays(hours.days)}.`}
        >
          <div className="relative">
            <CalendarBlankIcon
              size={20}
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted"
            />
            <Input
              id={ids.date}
              name="date"
              type="date"
              required
              value={date}
              min={bounds?.min}
              max={bounds?.max}
              onChange={(e) => onDateChange(e.target.value)}
              className="pl-12"
              {...describedBy(ids.date, errors.date, "hint")}
            />
          </div>
        </Field>

        <fieldset aria-describedby={errors.time ? `${ids.time}-error` : `${ids.time}-hint`}>
          <legend id={ids.time} tabIndex={-1} className="flex items-center gap-2 text-sm font-semibold">
            <ClockIcon size={18} aria-hidden="true" />
            Hora
            <span className="text-accent" aria-hidden="true">
              *
            </span>
          </legend>
          {!date ? (
            <p id={`${ids.time}-hint`} className="mt-2 text-sm text-ink-muted">
              Escolha primeiro a data para ver as horas disponíveis.
            </p>
          ) : slots.length === 0 ? (
            <p id={`${ids.time}-hint`} className="mt-2 text-sm text-ink-muted">
              Não há horas disponíveis neste dia. Escolha outra data.
            </p>
          ) : (
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
              <span id={`${ids.time}-hint`} className="sr-only">
                Horas disponíveis para o dia escolhido.
              </span>
              {slots.map((slot) => (
                <label key={slot} className="relative">
                  <input
                    type="radio"
                    name="time"
                    value={slot}
                    checked={time === slot}
                    onChange={() => setTime(slot)}
                    className="peer sr-only"
                  />
                  <span className="flex min-h-11 items-center justify-center rounded-xl border border-line text-sm font-semibold tabular-nums transition-colors duration-150 peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:ring-4 peer-focus-visible:ring-accent/25 hover:border-line-strong">
                    {slot}
                  </span>
                </label>
              ))}
            </div>
          )}
          <div className="mt-2">
            <FieldError id={`${ids.time}-error`} errors={errors.time} />
          </div>
        </fieldset>

        <Field id={ids.name} label="O seu nome" required errors={errors.name}>
          <Input
            id={ids.name}
            name="name"
            autoComplete="name"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
            {...describedBy(ids.name, errors.name)}
          />
        </Field>

        <Field
          id={ids.notes}
          label="Observações"
          errors={errors.notes}
          hint="Ex.: cor preferida, se é remoção de gel, etc."
        >
          <Textarea
            id={ids.notes}
            name="notes"
            rows={3}
            maxLength={300}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            {...describedBy(ids.notes, errors.notes, "hint")}
          />
        </Field>

        <div className="rounded-2xl bg-peach-50 p-4" aria-live="polite">
          {chosen.length === 0 ? (
            <p className="text-sm text-ink-muted">Ainda não escolheu nenhum serviço.</p>
          ) : (
            <dl className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <dt className="text-sm text-ink-muted">
                Total estimado
                {totalMinutes > 0 && <> · {formatDuration(totalMinutes)}</>}
              </dt>
              <dd className="font-display text-3xl font-bold tabular-nums">{formatPrice(total)}</dd>
            </dl>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button type="submit" size="lg" className="w-full text-center max-sm:px-5 max-sm:whitespace-normal">
            <WhatsappLogoIcon size={24} weight="fill" aria-hidden="true" />
            Enviar pedido pelo WhatsApp
          </Button>
          <p className="text-center text-sm text-ink-muted">
            Abre o WhatsApp com a mensagem pronta. A marcação fica confirmada quando o studio
            responder.
          </p>
        </div>

        {sentUrl && (
          <div
            role="status"
            className="flex gap-3 rounded-2xl border border-success/25 bg-success-soft p-4 text-success"
          >
            <CheckCircleIcon size={22} weight="fill" aria-hidden="true" className="mt-0.5 shrink-0" />
            <p className="text-sm">
              <strong>Mensagem pronta!</strong> Envie-a no WhatsApp para concluir o pedido.{" "}
              <a href={sentUrl} target="_blank" rel="noopener noreferrer" className="font-bold underline">
                O WhatsApp não abriu? Toque aqui.
              </a>
            </p>
          </div>
        )}
      </div>
    </form>
  );
}
