"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import {
  CalendarDotsIcon,
  CircleNotchIcon,
  ClockIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { ChangeReason } from "@/components/admin/change-reason";
import { DatePicker } from "@/components/booking/date-picker";
import { useNow } from "@/components/booking/use-now";
import { Button } from "@/components/ui/button";
import { getRescheduleBusy, rescheduleAppointment } from "@/lib/actions/appointments";
import { dateBounds, isSlotFree, slotsFor, type BusyInterval } from "@/lib/schedule";
import type { OpeningHours } from "@/lib/site";
import { buildRescheduleMessage, buildWhatsAppUrl } from "@/lib/whatsapp";

/** How far ahead the studio can move an appointment, even past what clients can book. */
const MIN_DAYS_AHEAD = 180;

/**
 * "Remarcar": the studio picks a new date and time (only free times, for this
 * appointment's length), saves it, and WhatsApp opens with the new time for the
 * client when there's a number.
 */
export function RescheduleAppointment({
  id,
  date: currentDate,
  time: currentTime,
  durationMinutes,
  hours,
  client,
  onDone,
  className = "",
}: {
  id: string;
  date: string;
  time: string;
  durationMinutes: number;
  hours: OpeningHours;
  /** What the WhatsApp message needs; null without a phone number. */
  client: { phone: string; name: string; serviceNames: string[]; studioName: string } | null;
  /** Called with the success message once the new time is saved. */
  onDone: (message: string) => void;
  /** Classes for the "Remarcar" button. */
  className?: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const reasonId = useId();
  const now = useNow();
  const [reason, setReason] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [busyByDate, setBusyByDate] = useState<Record<string, BusyInterval[]>>({});
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!date) return;
    let cancelled = false;
    getRescheduleBusy(id, date)
      .then((busy) => !cancelled && setBusyByDate((all) => ({ ...all, [date]: busy ?? [] })))
      .catch(() => !cancelled && setBusyByDate((all) => ({ ...all, [date]: all[date] ?? [] })));
    return () => {
      cancelled = true;
    };
  }, [id, date, availabilityVersion]);

  const bounds = now ? dateBounds({ ...hours, maxDaysAhead: Math.max(hours.maxDaysAhead, MIN_DAYS_AHEAD) }, now) : null;
  const slots = date && now ? slotsFor(date, hours, now) : [];
  const availabilityKnown = date in busyByDate;
  const isCurrent = (slot: string) => date === currentDate && slot === currentTime;
  const isFree = (slot: string) => !isCurrent(slot) && isSlotFree(slot, durationMinutes, busyByDate[date] ?? []);

  function open() {
    setDate("");
    setTime("");
    setReason("");
    setError(null);
    setBusyByDate({});
    dialogRef.current?.showModal();
  }

  function onDateChange(value: string) {
    setDate(value);
    setError(null);
    if (now && time && !slotsFor(value, hours, now).includes(time)) setTime("");
  }

  function save() {
    if (!date || !time) {
      setError("Escolha a nova data e a nova hora.");
      return;
    }
    // Opened now, while the click still counts: browsers block pop-ups opened
    // after waiting on the server. It gets the WhatsApp link once saved.
    const whatsapp = client ? window.open("", "_blank") : null;
    if (whatsapp) whatsapp.opener = null;

    startTransition(async () => {
      const result = await rescheduleAppointment(id, date, time, reason).catch(() => ({
        status: "error" as const,
        message: "Não foi possível remarcar. Verifique a ligação e tente novamente.",
      }));
      if (result.status === "error") {
        whatsapp?.close();
        setError(result.message);
        setAvailabilityVersion((v) => v + 1); // someone may have just taken it
        return;
      }
      dialogRef.current?.close();
      onDone(result.message);
      if (!whatsapp || !client) return;
      whatsapp.location.href = buildWhatsAppUrl(
        client.phone,
        buildRescheduleMessage({
          ...client,
          previousDate: currentDate,
          previousTime: currentTime,
          date: result.date,
          time: result.time,
          endTime: result.endTime,
        }),
      );
    });
  }

  return (
    <>
      <Button variant="secondary" onClick={open} className={className}>
        <CalendarDotsIcon size={20} aria-hidden="true" className="max-[380px]:hidden" />
        Remarcar
      </Button>

      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        className="m-auto max-h-[92dvh] w-[min(94vw,520px)] overflow-y-auto rounded-3xl bg-surface p-6 text-ink shadow-lift backdrop:bg-ink/50"
      >
        <h2 id={titleId} className="font-display text-2xl font-semibold">
          Remarcar marcação
        </h2>
        <p className="mt-2 text-ink-muted">
          Escolha a nova data e hora. A marcação fica confirmada no novo horário.
          {client && " A seguir abre-se o WhatsApp com a nova data e hora, pronta a enviar à cliente."}
        </p>

        <fieldset className="mt-5">
          <legend className="text-sm font-semibold">Nova data</legend>
          {bounds ? (
            <DatePicker value={date} bounds={bounds} hours={hours} onChange={onDateChange} />
          ) : (
            <div aria-hidden="true" className="mt-2 h-85 animate-pulse rounded-2xl bg-peach-50" />
          )}
        </fieldset>

        <fieldset className="mt-5">
          <legend className="flex items-center gap-2 text-sm font-semibold">
            <ClockIcon size={18} aria-hidden="true" />
            Nova hora
          </legend>
          {!date ? (
            <p className="mt-2 text-sm text-ink-muted">Escolha primeiro a data para ver as horas livres.</p>
          ) : slots.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">Não há horas disponíveis neste dia. Escolha outra data.</p>
          ) : !availabilityKnown ? (
            <div aria-busy="true" className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
              <span role="status" className="sr-only">
                A verificar as horas livres…
              </span>
              {slots.map((slot) => (
                <span key={slot} aria-hidden="true" className="min-h-11 animate-pulse rounded-xl bg-peach-50" />
              ))}
            </div>
          ) : slots.every((slot) => !isFree(slot)) ? (
            <p className="mt-2 text-sm text-ink-muted">Este dia já está completo. Escolha outra data.</p>
          ) : (
            <div className="mt-2 grid grid-cols-4 gap-2 sm:grid-cols-5">
              {slots.map((slot) => {
                const free = isFree(slot);
                return (
                  <label key={slot} className="relative" title={free ? undefined : isCurrent(slot) ? "Hora atual" : "Ocupado"}>
                    <input
                      type="radio"
                      name="reschedule-time"
                      value={slot}
                      checked={time === slot}
                      disabled={!free && time !== slot}
                      onChange={() => {
                        setTime(slot);
                        setError(null);
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
                      {!free && <span className="sr-only">{isCurrent(slot) ? " (hora atual)" : " (ocupado)"}</span>}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </fieldset>

        <ChangeReason id={reasonId} value={reason} onChange={setReason} disabled={pending} />

        {error && (
          <p
            role="alert"
            className="mt-5 flex items-start gap-2 rounded-2xl border border-danger/25 bg-danger-soft p-4 text-sm font-semibold text-danger"
          >
            <WarningCircleIcon size={20} weight="bold" aria-hidden="true" className="mt-px shrink-0" />
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => dialogRef.current?.close()} disabled={pending}>
            Voltar
          </Button>
          <Button disabled={pending || !date || !time} aria-busy={pending || undefined} onClick={save}>
            {pending && <CircleNotchIcon size={18} className="animate-spin" aria-hidden="true" />}
            {client ? "Remarcar e avisar a cliente" : "Remarcar"}
          </Button>
        </div>
      </dialog>
    </>
  );
}
