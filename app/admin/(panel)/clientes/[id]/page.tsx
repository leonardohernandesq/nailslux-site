import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, WhatsappLogoIcon } from "@phosphor-icons/react/ssr";
import { AppointmentStatusBadge } from "@/components/admin/appointment-status";
import { ChangeLog } from "@/components/admin/change-log";
import { ClientCardForm } from "@/components/admin/client-card-form";
import { getClient } from "@/lib/data/clients";
import { formatLongDate, formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { buildWhatsAppUrl } from "@/lib/whatsapp";

export const metadata: Metadata = { title: "Ficha da cliente" };

// Auth-gated and per-request: allowed to block (see app/admin/(panel)/layout.tsx).
export const instant = false;

const shortDate = (date: string | null) => (date ? formatLongDate(date).replace(/ de \d{4}$/, "") : "—");

/** The filter on "Cancelamentos e remarcações", kept in the URL (?alteracoes=). */
const CHANGE_FILTERS = [
  { value: "", label: "Todas" },
  { value: "cancelamentos", label: "Cancelamentos" },
  { value: "remarcacoes", label: "Remarcações" },
] as const;

export default async function ClientPage({ params, searchParams }: PageProps<"/admin/clientes/[id]">) {
  const [{ id }, { alteracoes }] = await Promise.all([params, searchParams]);
  const client = await getClient(id);
  if (!client) notFound();

  const filter = CHANGE_FILTERS.find((f) => f.value && f.value === alteracoes)?.value ?? "";
  const changes = client.changes.filter((change) =>
    filter === "cancelamentos" ? change.kind !== "rescheduled" : filter === "remarcacoes" ? change.kind === "rescheduled" : true,
  );
  const counts: Record<(typeof CHANGE_FILTERS)[number]["value"], number> = {
    "": client.changes.length,
    cancelamentos: client.changes.filter((c) => c.kind !== "rescheduled").length,
    remarcacoes: client.changes.filter((c) => c.kind === "rescheduled").length,
  };

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

        <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Stat label="Visitas">{client.visits}</Stat>
          <Stat label="Total gasto">{formatPrice(client.spentCents)}</Stat>
          <Stat label="Última visita">{shortDate(client.lastVisit)}</Stat>
          <Stat label="Próxima">{shortDate(client.nextVisit)}</Stat>
          <Stat label="Cancelamentos">{client.cancellations}</Stat>
          <Stat label="Remarcações">{client.reschedules}</Stat>
        </dl>
        <p className="mt-2 text-xs text-ink-muted">
          Visitas e total contam as marcações confirmadas até hoje. Cancelamentos e remarcações contam cada vez que
          aconteceram.
        </p>
      </article>

      <section aria-labelledby="card-title" className="rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
        <h2 id="card-title" className="mb-4 font-display text-2xl font-semibold">
          Notas e moldes
        </h2>
        <ClientCardForm clientId={client.id} handMold={client.handMold} footMold={client.footMold} notes={client.notes} />
      </section>

      <section id="alteracoes" aria-labelledby="changes-title" className="flex scroll-mt-6 flex-col gap-3">
        <h2 id="changes-title" className="font-display text-2xl font-semibold">
          Cancelamentos e remarcações
        </h2>
        {client.changes.length === 0 ? (
          <p className="rounded-3xl bg-surface p-6 text-ink-muted shadow-soft">
            Nenhum cancelamento nem remarcação registados.
          </p>
        ) : (
          <>
            <nav aria-label="Filtrar cancelamentos e remarcações" className="flex flex-wrap gap-2">
              {CHANGE_FILTERS.map((option) => {
                const active = option.value === filter;
                return (
                  <Link
                    key={option.value}
                    href={`/admin/clientes/${client.id}${option.value ? `?alteracoes=${option.value}` : ""}#alteracoes`}
                    scroll={false}
                    aria-current={active ? "page" : undefined}
                    className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors ${
                      active ? "bg-accent text-on-accent" : "bg-surface text-ink shadow-soft hover:bg-peach-50"
                    }`}
                  >
                    {option.label}
                    <span className="tabular-nums opacity-75">{counts[option.value]}</span>
                  </Link>
                );
              })}
            </nav>
            {changes.length === 0 ? (
              <p className="rounded-3xl bg-surface p-6 text-ink-muted shadow-soft">
                {filter === "cancelamentos" ? "Nenhum cancelamento registado." : "Nenhuma remarcação registada."}
              </p>
            ) : (
              <ChangeLog items={changes} />
            )}
          </>
        )}
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
