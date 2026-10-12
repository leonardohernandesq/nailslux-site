import type { Metadata } from "next";
import Link from "next/link";
import { CaretRightIcon, ClockIcon } from "@phosphor-icons/react/ssr";
import { AppointmentStatusBadge } from "@/components/admin/appointment-status";
import { getAppointmentsOverview, type AppointmentDTO } from "@/lib/data/appointments";
import { formatLongDate, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Marcações" };

// Auth-gated and per-request: allowed to block (see app/admin/(panel)/layout.tsx).
export const instant = false;

export default async function AppointmentsPage() {
  const { today, pending, upcoming } = await getAppointmentsOverview();

  // Upcoming confirmed appointments, grouped by day.
  const days = new Map<string, AppointmentDTO[]>();
  for (const appointment of upcoming) days.set(appointment.date, [...(days.get(appointment.date) ?? []), appointment]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-4xl font-semibold">Marcações</h1>
        <p className="text-ink-muted">
          Os pedidos chegam aqui quando a cliente envia o formulário. Só as marcações confirmadas ocupam
          horário no site.
        </p>
      </div>

      <section aria-labelledby="pending-title" className="flex flex-col gap-3">
        <h2 id="pending-title" className="font-display text-2xl font-semibold">
          Por confirmar <span className="text-ink-muted">({pending.length})</span>
        </h2>
        {pending.length === 0 ? (
          <p className="rounded-3xl bg-surface p-6 text-ink-muted shadow-soft">Não há pedidos por confirmar.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {pending.map((appointment) => (
              <li key={appointment.id}>
                <AppointmentCard appointment={appointment} past={appointment.date < today} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="upcoming-title" className="flex flex-col gap-3">
        <h2 id="upcoming-title" className="font-display text-2xl font-semibold">
          Próximas marcações
        </h2>
        {days.size === 0 ? (
          <p className="rounded-3xl bg-surface p-6 text-ink-muted shadow-soft">Ainda não há marcações confirmadas.</p>
        ) : (
          [...days].map(([date, list]) => (
            <div key={date} className="flex flex-col gap-2">
              <h3 className="text-sm font-bold text-ink-muted first-letter:uppercase">
                {date === today ? "Hoje · " : ""}
                {formatLongDate(date)}
              </h3>
              <ul className="flex flex-col gap-2">
                {list.map((appointment) => (
                  <li key={appointment.id}>
                    <AppointmentCard appointment={appointment} compact />
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

function AppointmentCard({
  appointment,
  compact = false,
  past = false,
}: {
  appointment: AppointmentDTO;
  compact?: boolean;
  past?: boolean;
}) {
  return (
    <Link
      href={`/admin/marcacoes/${appointment.id}`}
      className="group flex items-center gap-4 rounded-3xl bg-surface p-4 shadow-soft transition-shadow hover:shadow-lift sm:p-5"
    >
      <div className="flex min-w-16 flex-col items-center rounded-2xl bg-peach-50 px-3 py-2 text-center">
        <span className="font-display text-xl leading-none font-bold lining-nums tabular-nums">{appointment.time}</span>
        <span className="mt-1 text-xs text-ink-muted tabular-nums">até {appointment.endTime}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <p className="font-semibold wrap-anywhere">{appointment.name}</p>
          {!compact && <AppointmentStatusBadge status={appointment.status} />}
        </div>
        <p className="text-sm text-ink-muted wrap-anywhere">{appointment.serviceNames.join(", ")}</p>
        {!compact && (
          <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-ink-muted first-letter:uppercase">
            <ClockIcon size={16} aria-hidden="true" />
            <span className="first-letter:uppercase">{formatLongDate(appointment.date)}</span>
            {past && <span className="font-semibold text-danger">· data já passou</span>}
          </p>
        )}
      </div>
      <span className="hidden font-bold tabular-nums sm:block">{formatPrice(appointment.totalCents)}</span>
      <CaretRightIcon size={20} aria-hidden="true" className="shrink-0 text-ink-muted group-hover:text-ink" />
    </Link>
  );
}
