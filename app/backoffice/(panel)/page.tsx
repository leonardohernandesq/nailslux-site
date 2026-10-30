import type { Metadata } from "next";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";
import { StudioAction } from "@/components/platform/studio-action";
import { getPlatformOverview, type StudioRow } from "@/lib/data/platform";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Visão geral" };

// Auth-gated and per-request: allowed to block (see app/backoffice/(panel)/layout.tsx).
export const instant = false;

const STATUS: Record<StudioRow["status"], { label: string; tone: string }> = {
  active: { label: "Online", tone: "bg-success-soft text-success" },
  pending: { label: "Por concluir", tone: "bg-peach-100 text-ink" },
  suspended: { label: "Suspenso", tone: "bg-danger-soft text-danger" },
};

const SUBSCRIPTION: Record<string, string> = {
  active: "Em dia",
  trialing: "Em dia",
  past_due: "Pagamento em falta",
  unpaid: "Por pagar",
  canceled: "Cancelada",
  incomplete: "Incompleta",
};

function billingLabel(studio: StudioRow): string {
  if (!studio.subscriptionStatus) return studio.status === "active" ? "Faturação direta" : "Sem subscrição";
  return SUBSCRIPTION[studio.subscriptionStatus] ?? studio.subscriptionStatus;
}

function Stat({ label, value, note }: { label: string; value: string | number; note?: string }) {
  return (
    <div className="rounded-2xl bg-surface p-4 shadow-soft">
      <p className="text-sm font-semibold text-ink-muted">{label}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums">{value}</p>
      {note && <p className="mt-0.5 text-xs text-ink-muted">{note}</p>}
    </div>
  );
}

export default async function BackofficePage() {
  const { studios, totals, monthlyRevenueCents } = await getPlatformOverview();

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Visão geral</h1>

      <section aria-label="Resumo" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Studios online" value={totals.online} note={`${totals.all} no total`} />
        <Stat label="A pagar pela Stripe" value={totals.paying} note={totals.paymentIssues ? `${totals.paymentIssues} com pagamento em falta` : undefined} />
        <Stat label="Por concluir" value={totals.pending} note={totals.suspended ? `${totals.suspended} suspensos` : undefined} />
        <Stat
          label="Receita mensal"
          value={monthlyRevenueCents === null ? "—" : formatPrice(monthlyRevenueCents)}
          note={monthlyRevenueCents === null ? "Stripe indisponível" : "Estimativa, sem impostos nem taxas"}
        />
      </section>

      <section aria-labelledby="studios-title" className="mt-10">
        <h2 id="studios-title" className="font-display text-2xl font-bold">
          Studios
        </h2>
        {studios.length === 0 ? (
          <p className="mt-4 rounded-2xl bg-surface p-6 text-center text-ink-muted shadow-soft">Ainda não há studios.</p>
        ) : (
          <ul className="mt-4 flex flex-col gap-3">
            {studios.map((studio) => (
              <li key={studio.id} className="flex flex-col gap-3 rounded-2xl bg-surface p-4 shadow-soft md:flex-row md:items-center md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-bold">{studio.name}</p>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS[studio.status].tone}`}>{STATUS[studio.status].label}</span>
                  </div>
                  <p className="truncate text-sm text-ink-muted">{studio.ownerEmail ?? "Sem conta associada"}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {billingLabel(studio)} · {studio.services} serviços · {studio.bookingsLast30Days} pedidos em 30 dias
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {studio.status === "active" && (
                    <a
                      href={`/${studio.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-muted hover:bg-peach-50 hover:text-ink"
                    >
                      <ArrowSquareOutIcon size={16} aria-hidden="true" />
                      Ver site
                    </a>
                  )}
                  <StudioAction studio={studio} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
