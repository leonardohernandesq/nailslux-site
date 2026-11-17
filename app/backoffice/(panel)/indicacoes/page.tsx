import type { Metadata } from "next";
import Link from "next/link";
import { CopyLink } from "@/components/platform/copy-link";
import { formatMonth } from "@/lib/billing/paid-months";
import { getReferralOverview, type ReferredRow } from "@/lib/data/referrals";

export const metadata: Metadata = { title: "Indicações" };

// Auth-gated and per-request: allowed to block (see app/backoffice/(panel)/layout.tsx).
export const instant = false;

const joined = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Lisbon" });

function StatusBadge({ studio }: { studio: ReferredRow }) {
  const [label, tone] =
    studio.status === "active" && studio.paying
      ? ["Ativo", "bg-success-soft text-success"]
      : studio.status === "pending"
        ? ["Ainda não ativou", "bg-peach-100 text-ink"]
        : ["Inativo", "bg-danger-soft text-danger"];
  return <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold ${tone}`}>{label}</span>;
}

function Months({ studio }: { studio: ReferredRow }) {
  if (studio.paidMonths === null) return <p className="text-sm text-ink-muted">Sem faturas na Stripe.</p>;
  if (studio.paidMonths.length === 0) return <p className="text-sm text-ink-muted">Ainda não pagou nenhum mês.</p>;
  return (
    <div>
      <p className="text-sm text-ink-muted">
        {studio.paidMonths.length === 1 ? "1 mês pago" : `${studio.paidMonths.length} meses pagos`}
        {studio.freeMonth && " · mais o mês grátis da indicação"}
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-1.5" aria-label={`Meses pagos por ${studio.name}`}>
        {studio.paidMonths.map((month) => (
          <li key={month} className="rounded-full bg-peach-50 px-2.5 py-0.5 text-xs font-semibold">
            {formatMonth(month)}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function ReferralsPage() {
  const groups = await getReferralOverview();

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Indicações</h1>
      <p className="mt-1 text-ink-muted">
        Quem indicou studios, e se esses studios continuam ativos. Os meses pagos vêm das faturas da Stripe.
      </p>

      {groups.length === 0 && <p className="mt-6 rounded-2xl bg-surface p-6 text-center text-ink-muted shadow-soft">Ainda não há indicações.</p>}

      <ul className="mt-6 flex flex-col gap-4">
        {groups.map((group) => {
          const active = group.referred.filter((studio) => studio.status === "active" && studio.paying).length;
          return (
            <li key={group.key} className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft sm:p-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="font-display text-xl font-bold">
                  {group.name}
                  {group.kind === "partner" && <span className="ml-2 rounded-full bg-ink px-2.5 py-0.5 align-middle text-xs font-bold text-gold">Parceiro</span>}
                </h2>
                <p className="text-sm text-ink-muted">
                  {group.referred.length === 1 ? "1 studio indicado" : `${group.referred.length} studios indicados`} · {active} ativos
                </p>
              </div>
              {group.url && <CopyLink url={group.url} label={`Link de indicação de ${group.name}`} />}

              {group.referred.length === 0 ? (
                <p className="text-sm text-ink-muted">Ainda ninguém se registou por este link.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {group.referred.map((studio) => (
                    <li key={studio.id} className="flex flex-col gap-2 rounded-2xl bg-cream/60 p-4 ring-1 ring-line">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <Link href={`/backoffice/studios/${studio.id}`} className="font-semibold hover:underline">
                            {studio.name}
                          </Link>
                          <p className="text-xs text-ink-muted">Registou-se a {joined.format(new Date(studio.joinedAt))}</p>
                        </div>
                        <StatusBadge studio={studio} />
                      </div>
                      <Months studio={studio} />
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </>
  );
}
