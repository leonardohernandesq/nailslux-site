import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDownIcon,
  ArrowUpIcon,
  CheckCircleIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react/ssr";
import { ConfirmDelete } from "@/components/admin/confirm-delete";
import { IconSubmitButton } from "@/components/admin/submit-button";
import { buttonClasses } from "@/components/ui/button";
import { deleteService, moveService, setServiceActive } from "@/lib/actions/services";
import { getAllServices } from "@/lib/data/services";
import { formatDuration, formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Serviços" };

// Auth-gated and per-request: allowed to block (see app/admin/(panel)/layout.tsx).
export const instant = false;

export default async function ServicesAdminPage({ searchParams }: PageProps<"/admin/servicos">) {
  const [services, { saved }] = await Promise.all([getAllServices(), searchParams]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold">Serviços</h1>
          <p className="text-ink-muted">Os serviços visíveis aparecem no site por esta ordem.</p>
        </div>
        <Link href="/admin/servicos/novo" className={buttonClasses()}>
          <PlusIcon size={20} weight="bold" aria-hidden="true" />
          Novo serviço
        </Link>
      </div>

      {saved && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-2xl border border-success/25 bg-success-soft p-4 text-sm font-semibold text-success"
        >
          <CheckCircleIcon size={20} weight="fill" aria-hidden="true" />
          Serviço guardado. O site já está atualizado.
        </p>
      )}

      {services.length === 0 ? (
        <div className="rounded-3xl bg-surface p-10 text-center shadow-soft">
          <p className="font-display text-2xl font-semibold">Ainda não há serviços</p>
          <p className="mt-1 text-ink-muted">Crie o primeiro para que as clientes o possam escolher.</p>
          <Link href="/admin/servicos/novo" className={buttonClasses({ className: "mt-6" })}>
            <PlusIcon size={20} weight="bold" aria-hidden="true" />
            Criar serviço
          </Link>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {services.map((service, index) => (
            <li
              key={service.id}
              className={`flex flex-col gap-3 rounded-3xl border bg-surface p-4 shadow-soft sm:flex-row sm:items-center sm:p-5 ${
                service.active ? "border-line" : "border-dashed border-line-strong"
              }`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className={`text-lg font-bold ${service.active ? "" : "text-ink-muted"}`}>
                    {service.name}
                  </h2>
                  {!service.active && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-peach-100 px-2.5 py-0.5 text-xs font-bold text-ink-muted">
                      <EyeSlashIcon size={14} aria-hidden="true" />
                      Escondido
                    </span>
                  )}
                </div>
                <p className="text-sm text-ink-muted">
                  <span className="font-bold text-ink tabular-nums">{formatPrice(service.priceCents)}</span>
                  {service.durationMinutes ? ` · ${formatDuration(service.durationMinutes)}` : ""}
                  {service.description ? ` · ${service.description}` : ""}
                </p>
              </div>

              <div className="-mx-1 flex items-center gap-0.5 self-end sm:self-auto">
                {index > 0 ? (
                  <form action={moveService.bind(null, service.id, "up")}>
                    <IconSubmitButton label={`Subir ${service.name}`}>
                      <ArrowUpIcon size={20} aria-hidden="true" />
                    </IconSubmitButton>
                  </form>
                ) : (
                  <span className="size-11" aria-hidden="true" />
                )}
                {index < services.length - 1 ? (
                  <form action={moveService.bind(null, service.id, "down")}>
                    <IconSubmitButton label={`Descer ${service.name}`}>
                      <ArrowDownIcon size={20} aria-hidden="true" />
                    </IconSubmitButton>
                  </form>
                ) : (
                  <span className="size-11" aria-hidden="true" />
                )}
                <form action={setServiceActive.bind(null, service.id, !service.active)}>
                  <IconSubmitButton
                    label={service.active ? `Esconder ${service.name} do site` : `Mostrar ${service.name} no site`}
                  >
                    {service.active ? (
                      <EyeIcon size={20} aria-hidden="true" />
                    ) : (
                      <EyeSlashIcon size={20} aria-hidden="true" />
                    )}
                  </IconSubmitButton>
                </form>
                <Link
                  href={`/admin/servicos/${service.id}`}
                  aria-label={`Editar ${service.name}`}
                  title="Editar"
                  className="flex size-11 items-center justify-center rounded-full text-ink-muted hover:bg-peach-50 hover:text-ink"
                >
                  <PencilSimpleIcon size={20} aria-hidden="true" />
                </Link>
                <ConfirmDelete
                  action={deleteService.bind(null, service.id)}
                  itemLabel={service.name}
                  description="O serviço deixa de aparecer no site. Esta ação não pode ser anulada — se só quer escondê-lo, use o botão do olho."
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
