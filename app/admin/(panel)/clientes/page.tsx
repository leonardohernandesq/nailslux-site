import type { Metadata } from "next";
import Link from "next/link";
import { CaretRightIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/ssr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { getClients } from "@/lib/data/clients";
import { formatLongDate, formatPrice } from "@/lib/format";
import { formatPhone } from "@/lib/phone";

export const metadata: Metadata = { title: "Clientes" };

// Auth-gated and per-request: allowed to block (see app/admin/(panel)/layout.tsx).
export const instant = false;

export default async function ClientsPage({ searchParams }: PageProps<"/admin/clientes">) {
  const { q } = await searchParams;
  const search = typeof q === "string" ? q : "";
  const clients = await getClients(search);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-4xl font-semibold">Clientes</h1>
        <p className="text-ink-muted">Quem já pediu marcação pelo site, com o histórico, os moldes e as suas notas.</p>
      </div>

      <form role="search" className="flex gap-2">
        <label htmlFor="client-search" className="sr-only">
          Procurar por nome ou número
        </label>
        <Input id="client-search" name="q" type="search" defaultValue={search} placeholder="Nome ou número" className="flex-1" />
        <Button type="submit" variant="secondary" aria-label="Procurar">
          <MagnifyingGlassIcon size={20} aria-hidden="true" />
          <span className="hidden sm:inline">Procurar</span>
        </Button>
      </form>

      {clients.length === 0 ? (
        <p className="rounded-3xl bg-surface p-6 text-ink-muted shadow-soft">
          {search ? "Nenhuma cliente encontrada." : "As clientes aparecem aqui depois do primeiro pedido de marcação."}
        </p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Clientes">
          {clients.map((client) => (
            <li key={client.id}>
              <Link
                href={`/admin/clientes/${client.id}`}
                className="group flex items-center gap-4 rounded-3xl bg-surface p-4 shadow-soft transition-shadow hover:shadow-lift sm:p-5"
              >
                <span aria-hidden="true" className="grid size-12 shrink-0 place-items-center rounded-full bg-peach-100 font-display text-xl font-bold">
                  {client.name.trim()[0]?.toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold wrap-anywhere">{client.name}</p>
                  <p className="text-sm text-ink-muted tabular-nums">{formatPhone(client.phone)}</p>
                  <p className="text-sm text-ink-muted">
                    {client.visits === 1 ? "1 visita" : `${client.visits} visitas`}
                    {client.nextVisit
                      ? ` · próxima: ${formatLongDate(client.nextVisit)}`
                      : client.lastVisit
                        ? ` · última: ${formatLongDate(client.lastVisit)}`
                        : ""}
                  </p>
                </div>
                <span className="hidden font-bold tabular-nums sm:block">{formatPrice(client.spentCents)}</span>
                <CaretRightIcon size={20} aria-hidden="true" className="shrink-0 text-ink-muted group-hover:text-ink" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
