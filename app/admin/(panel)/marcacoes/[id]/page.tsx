import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, WarningIcon, WhatsappLogoIcon } from "@phosphor-icons/react/ssr";
import { AppointmentActions } from "@/components/admin/appointment-actions";
import { AppointmentStatusBadge } from "@/components/admin/appointment-status";
import { ClientMoldsForm } from "@/components/admin/client-molds-form";
import { getAppointment } from "@/lib/data/appointments";
import { formatDuration, formatLongDate, formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Marcação" };

// Auth-gated and per-request: allowed to block (see app/admin/(panel)/layout.tsx).
export const instant = false;

const requestedAt = new Intl.DateTimeFormat("pt-PT", {
  dateStyle: "long",
  timeStyle: "short",
  timeZone: "Europe/Lisbon",
});

export default async function AppointmentPage({ params }: PageProps<"/admin/marcacoes/[id]">) {
  const { id } = await params;
  const result = await getAppointment(id);
  if (!result) notFound();
  const { appointment, conflicts, isPast } = result;
  const open = appointment.status === "pending" || appointment.status === "declined";

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/marcacoes"
        className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-accent hover:underline"
      >
        <ArrowLeftIcon size={18} aria-hidden="true" />
        Marcações
      </Link>

      <article className="rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-ink-muted">Pedido de marcação</p>
            <h1 className="font-display text-4xl font-semibold wrap-anywhere">{appointment.name}</h1>
          </div>
          <AppointmentStatusBadge status={appointment.status} />
        </div>

        <dl className="mt-6 grid gap-x-6 gap-y-4 sm:grid-cols-2">
          <Detail label="Data">
            <span className="first-letter:uppercase">{formatLongDate(appointment.date)}</span>
          </Detail>
          <Detail label="Hora">
            <span className="tabular-nums">
              {appointment.time}–{appointment.endTime}
            </span>{" "}
            <span className="text-ink-muted">({formatDuration(appointment.durationMinutes)})</span>
          </Detail>
          <Detail label={appointment.serviceNames.length === 1 ? "Serviço" : "Serviços"}>
            <ul>
              {appointment.serviceNames.map((service) => (
                <li key={service}>{service}</li>
              ))}
            </ul>
          </Detail>
          <Detail label="Total estimado">
            <span className="tabular-nums">{formatPrice(appointment.totalCents)}</span>
          </Detail>
          {appointment.notes && (
            <div className="sm:col-span-2">
              <Detail label="Observações">
                <span className="wrap-anywhere whitespace-pre-line">{appointment.notes}</span>
              </Detail>
            </div>
          )}
          <Detail label="Pedido feito em">
            <span className="text-ink-muted">{requestedAt.format(new Date(appointment.createdAt))}</span>
          </Detail>
        </dl>
      </article>

      <section aria-labelledby="client-title" className="rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
        <h2 id="client-title" className="font-display text-2xl font-semibold">
          Cliente
        </h2>
        {appointment.phone ? (
          <>
            <a
              href={buildWhatsAppUrl(appointment.phone, `Olá, ${appointment.name}!`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex min-h-11 items-center gap-2 font-semibold text-accent tabular-nums hover:underline"
            >
              <WhatsappLogoIcon size={20} weight="fill" aria-hidden="true" />
              {formatPhone(appointment.phone)}
            </a>
            <p className="mb-4 text-sm text-ink-muted">
              Os moldes ficam guardados neste número e aparecem em todas as marcações desta cliente.
            </p>
            <ClientMoldsForm appointmentId={appointment.id} molds={appointment.molds} />
          </>
        ) : (
          <p className="mt-1 text-sm text-ink-muted">
            Este pedido foi feito antes de o site pedir o WhatsApp, por isso não é possível guardar moldes.
          </p>
        )}
      </section>

      {open && conflicts.length > 0 && (
        <div role="note" className="flex gap-3 rounded-2xl border border-danger/25 bg-danger-soft p-4 text-danger">
          <WarningIcon size={22} weight="bold" aria-hidden="true" className="mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-bold">Este horário já está ocupado por:</p>
            <ul className="mt-1 list-disc pl-5">
              {conflicts.map((other) => (
                <li key={other.id}>
                  <Link href={`/admin/marcacoes/${other.id}`} className="underline">
                    {other.name}, {other.time}–{other.endTime}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-2">Para confirmar este pedido, cancele primeiro a outra marcação ou combine outra hora.</p>
          </div>
        </div>
      )}

      {open && isPast && (
        <p className="rounded-2xl bg-peach-50 p-4 text-sm text-ink-muted">A data deste pedido já passou.</p>
      )}

      <AppointmentActions id={appointment.id} status={appointment.status} hasConflict={conflicts.length > 0} />
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-sm font-bold text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-semibold">{children}</dd>
    </div>
  );
}
