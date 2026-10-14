"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import {
  CalendarBlankIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  ClockIcon,
  WarningCircleIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Field, FieldError, Input, Textarea, describedBy } from "@/components/ui/field";
import { formatDuration, formatPrice } from "@/lib/format";
import { bookingDuration, dateBounds, isSlotFree, slotsFor, type BusyInterval } from "@/lib/schedule";
import { formatOpeningDays, type OpeningHours } from "@/lib/site";
import { createBookingSchema } from "@/lib/validation/booking";
import { buildBookingMessage, buildWhatsAppUrl } from "@/lib/whatsapp";
import { requestAppointment, type BookingField } from "@/lib/actions/appointments";
import { track } from "@/lib/analytics/client";
import { useBooking } from "./booking-context";
import { useNow } from "./use-now";

type Errors = Partial<Record<BookingField, string[]>>;

const TAKEN_FOR_DURATION = "Esta hora já não tem tempo livre suficiente para os serviços escolhidos. Escolha outra.";

const FIELD_LABELS: Record<keyof Errors, string> = {
  serviceIds: "Serviços",
  date: "Data",
  time: "Hora",
  name: "Nome",
  phone: "WhatsApp",
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
    phone: `${uid}-phone`,
    notes: `${uid}-notes`,
  };

  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [attempted, setAttempted] = useState(false);
  const [sentUrl, setSentUrl] = useState<string | null>(null);
  const [failedSubmits, setFailedSubmits] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<{ field: BookingField; message: string } | null>(null);
  // Times already taken (confirmed appointments), per date, as loaded from the server.
  const [busyByDate, setBusyByDate] = useState<Record<string, BusyInterval[]>>({});
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const summaryRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
    const controller = new AbortController();
    fetch(`/api/availability?date=${date}`, { signal: controller.signal, cache: "no-store" })
      .then((response) => (response.ok ? response.json() : { busy: [] }))
      .then((data: { busy?: BusyInterval[] }) => setBusyByDate((all) => ({ ...all, [date]: data.busy ?? [] })))
      .catch(() => {
        // Offline: show every time rather than wait forever; the server re-checks
        // the time when the request is sent.
        if (!controller.signal.aborted) setBusyByDate((all) => ({ ...all, [date]: all[date] ?? [] }));
      });
    return () => controller.abort();
  }, [date, availabilityVersion]);

  // Move focus to the error summary after each failed submit.
  useEffect(() => {
    if (failedSubmits > 0) summaryRef.current?.focus();
  }, [failedSubmits]);

  const values = { name, phone, serviceIds: selectedIds, date, time, notes };

  const chosen = services.filter((service) => selectedIds.includes(service.id));
  const total = chosen.reduce((sum, service) => sum + service.priceCents, 0);
  const totalMinutes = chosen.reduce((sum, service) => sum + (service.durationMinutes ?? 0), 0);
  // How long the chosen services block the agenda (unknown durations count as 1h).
  const blockMinutes = chosen.length > 0 ? bookingDuration(chosen) : hours.slotMinutes;
  const busy = busyByDate[date] ?? [];
  // Times only show once we know which are taken, so none flips to "occupied" a moment later.
  const availabilityKnown = date in busyByDate;
  const isFree = (slot: string) => isSlotFree(slot, blockMinutes, busy);

  function validate(at: Date) {
    const schema = createBookingSchema({ serviceIds: services.map((s) => s.id), hours, now: at });
    const result = schema.safeParse(values);
    if (!result.success) return { success: false as const, issues: result.error.issues };
    if (!isFree(result.data.time)) {
      return { success: false as const, issues: [{ path: ["time"], message: TAKEN_FOR_DURATION }] };
    }
    return { success: true as const, data: result.data };
  }

  // After the first submit attempt, errors update live as the client fixes them.
  const errors: Errors = {};
  if (attempted && now) {
    const result = validate(now);
    if (!result.success) {
      for (const issue of result.issues) {
        const key = issue.path[0] as keyof Errors;
        (errors[key] ??= []).push(issue.message);
      }
    }
  }
  if (serverError && !errors[serverError.field]) errors[serverError.field] = [serverError.message];
  const errorKeys = (Object.keys(FIELD_LABELS) as (keyof Errors)[]).filter((k) => errors[k]?.length);

  const bounds = now ? dateBounds(hours, now) : null;
  const slots = date && now ? slotsFor(date, hours, now) : [];

  function onDateChange(value: string) {
    setDate(value);
    setServerError(null);
    // Keep the chosen time only if it's still offered on the new date.
    if (now && time && !slotsFor(value, hours, now).includes(time)) setTime("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setAttempted(true);
    setSentUrl(null);
    setServerError(null);

    const result = validate(new Date());
    if (!result.success) {
      setFailedSubmits((n) => n + 1);
      return;
    }

    // Browsers only allow pop-ups straight from a click, so open the tab now and
    // point it at WhatsApp once the request is saved.
    const popup = window.open("", "_blank");
    setSubmitting(true);
    const saved = await requestAppointment(values).catch(() => ({
      ok: false as const,
      field: undefined,
      message: "Não foi possível enviar o pedido. Verifique a ligação e tente novamente.",
    }));
    setSubmitting(false);

    if (!saved.ok) {
      popup?.close();
      setServerError({ field: saved.field ?? "time", message: saved.message });
      if (saved.field === "time") setAvailabilityVersion((v) => v + 1); // someone just took it
      setFailedSubmits((n) => n + 1);
      return;
    }

    const url = buildWhatsAppUrl(whatsappNumber, buildBookingMessage(result.data, services));
    if (popup) {
      popup.opener = null;
      popup.location.href = url;
    } else {
      window.location.href = url; // popup blocked: open in the same tab
    }
    setSentUrl(url);
    track({
      type: "booking",
      serviceIds: result.data.serviceIds,
      date: result.data.date,
      time: result.data.time,
    });
  }

  if (services.length === 0) {
    return (
      <div className="rounded-3xl bg-surface p-6 text-center shadow-soft sm:p-10">
        <p className="text-lg">Os serviços vão ser publicados em breve.</p>
        <p className="mt-2 text-ink-muted">Entretanto, fale connosco diretamente:</p>
        <a
          data-track-whatsapp="no-services"
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
                    value={service.id}
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
        <h3 className="font-display text-2xl font-semibold">2. Data, hora e contacto</h3>

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
          ) : !availabilityKnown ? (
            <div aria-busy="true" className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
              <span id={`${ids.time}-hint`} role="status" className="sr-only">
                A verificar as horas disponíveis…
              </span>
              {slots.map((slot) => (
                <span key={slot} aria-hidden="true" className="min-h-11 animate-pulse rounded-xl bg-peach-50" />
              ))}
            </div>
          ) : slots.every((slot) => !isFree(slot)) ? (
            <p id={`${ids.time}-hint`} className="mt-2 text-sm text-ink-muted">
              Este dia já está completo. Escolha outra data.
            </p>
          ) : (
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5 lg:grid-cols-4 xl:grid-cols-5">
              <span id={`${ids.time}-hint`} className="sr-only">
                Horas para o dia escolhido. As riscadas já estão ocupadas.
              </span>
              {slots.map((slot) => {
                const free = isFree(slot);
                return (
                  <label key={slot} className="relative" title={free ? undefined : "Ocupado"}>
                    <input
                      type="radio"
                      name="time"
                      value={slot}
                      checked={time === slot}
                      // A chosen time that became taken stays selectable, so its error can be fixed.
                      disabled={!free && time !== slot}
                      onChange={() => {
                        setTime(slot);
                        setServerError(null);
                      }}
                      className="peer sr-only"
                    />
                    <span
                      className={`flex min-h-11 items-center justify-center rounded-xl border text-sm font-semibold tabular-nums transition-colors duration-150 peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:ring-4 peer-focus-visible:ring-accent/25 ${
                        free
                          ? "cursor-pointer border-line hover:border-line-strong"
                          : "cursor-not-allowed border-dashed border-line text-ink-muted/60 line-through"
                      }`}
                    >
                      {slot}
                      {!free && <span className="sr-only"> (ocupado)</span>}
                    </span>
                  </label>
                );
              })}
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
          id={ids.phone}
          label="O seu WhatsApp"
          required
          errors={errors.phone}
          hint="Para confirmarmos a marcação. Se não for português, comece com o indicativo (ex.: +55)."
        >
          <Input
            id={ids.phone}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            required
            maxLength={20}
            placeholder="912 345 678"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setServerError(null);
            }}
            {...describedBy(ids.phone, errors.phone, "hint")}
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
          <Button
            type="submit"
            size="lg"
            aria-disabled={submitting || undefined}
            className="w-full text-center max-sm:px-5 max-sm:whitespace-normal"
          >
            {submitting ? (
              <CircleNotchIcon size={24} className="animate-spin" aria-hidden="true" />
            ) : (
              <WhatsappLogoIcon size={24} weight="fill" aria-hidden="true" />
            )}
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
            className="flex gap-3 rounded-2xl border border-success/25 bg-success-soft p-4 text-success transition-[opacity,translate] duration-300 ease-(--ease-out-soft) starting:translate-y-2 starting:opacity-0"
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
