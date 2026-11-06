import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, WhatsappLogoIcon } from "@phosphor-icons/react/ssr";
import { AppointmentStatusBadge } from "@/components/admin/appointment-status";
import { ClientCardForm } from "@/components/admin/client-card-form";
import { getClient } from "@/lib/data/clients";
import { formatLongDate, formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Ficha da cliente" };

// Auth-gated and per-request: allowed to block (see app/admin/(panel)/layout.tsx).
export const instant = false;

const shortDate = (date: string | null) => (date ? formatLongDate(date).replace(/ de \d{4}$/, "") : "—");

export default async function ClientPage({ params }: PageProps<"/admin/clientes/[id]">) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();

  return (
    <div className="flex flex-col gap-6">
      <Link href="/admin/clientes" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold text-accent hover:underline">
        <ArrowLeftIcon size={18} aria-hidden="true" />
        Clientes
      </Link>

      <article className="rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
        <p className="text-sm font-bold text-ink-muted">Ficha da cliente</p>
        <h1 className="font-display text-4xl font-semibold wrap-anywhere">{client.name}</h1>
        <a
          href={buildWhatsAppUrl(client.phone, `Olá, ${client.name.trim().split(/\s+/)[0]}!`)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 inline-flex min-h-11 items-center gap-2 font-semibold text-accent tabular-nums hover:underline"
        >
          <WhatsappLogoIcon size={20} weight="fill" aria-hidden="true" />
          {formatPhone(client.phone)}
        </a>

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Visitas">{client.visits}</Stat>
          <Stat label="Total gasto">{formatPrice(client.spentCents)}</Stat>
          <Stat label="Última visita">{shortDate(client.lastVisit)}</Stat>
          <Stat label="Próxima">{shortDate(client.nextVisit)}</Stat>
        </dl>
        <p className="mt-2 text-xs text-ink-muted">Visitas e total contam as marcações confirmadas até hoje.</p>
      </article>

      <section aria-labelledby="card-title" className="rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
        <h2 id="card-title" className="mb-4 font-display text-2xl font-semibold">
          Notas e moldes
        </h2>
        <ClientCardForm clientId={client.id} handMold={client.handMold} footMold={client.footMold} notes={client.notes} />
      </section>

      <section aria-labelledby="history-title" className="flex flex-col gap-3">
        <h2 id="history-title" className="font-display text-2xl font-semibold">
          Histórico
        </h2>
        {client.history.length === 0 ? (
          <p className="rounded-3xl bg-surface p-6 text-ink-muted shadow-soft">Ainda sem marcações.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {client.history.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/admin/marcacoes/${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-surface p-4 shadow-soft transition-shadow hover:shadow-lift"
                >
                  <div className="min-w-0">
                    <p className="font-semibold first-letter:uppercase">
                      {formatLongDate(item.date)} · <span className="tabular-nums">{item.time}</span>
                    </p>
                    <p className="text-sm text-ink-muted wrap-anywhere">{item.serviceNames.join(", ")}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold tabular-nums">{formatPrice(item.totalCents)}</span>
                    <AppointmentStatusBadge status={item.status} />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-peach-50 p-3">
      <dt className="text-xs font-bold text-ink-muted">{label}</dt>
      <dd className="mt-0.5 font-display text-xl font-bold tabular-nums">{children}</dd>
    </div>
  );
}
