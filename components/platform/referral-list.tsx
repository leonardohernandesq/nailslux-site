"use client";

import { useDeferredValue, useState } from "react";
import Link from "next/link";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { formatMonth } from "@/lib/billing/paid-months";
import type { ReferredRow, ReferrerGroup } from "@/lib/data/referrals";
import { CopyLink } from "./copy-link";

const joined = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "short", year: "numeric", timeZone: "Europe/Lisbon" });

/** "Inês" and "ines" match: no accents or case. */
const fold = (text: string) => text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const isActive = (studio: ReferredRow) => studio.status === "active" && studio.paying;

function StatusBadge({ studio }: { studio: ReferredRow }) {
  const [label, tone] = isActive(studio)
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

/** The referrers, with a search over their names and the studios they brought. */
export function ReferralList({ groups }: { groups: ReferrerGroup[] }) {
  const [query, setQuery] = useState("");
  const search = fold(useDeferredValue(query).trim());
  const shown = search
    ? groups.filter((group) => fold(group.name).includes(search) || group.referred.some((studio) => fold(studio.name).includes(search)))
    : groups;

  return (
    <>
      <div className="relative mt-6">
        <MagnifyingGlassIcon size={20} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Procurar studio ou parceiro"
          placeholder="Procurar studio ou parceiro"
          className="min-h-12 w-full rounded-2xl border border-line-strong bg-surface pr-4 pl-11 text-base focus:border-accent focus:ring-4 focus:ring-accent/15 focus:outline-none"
        />
      </div>
      <p role="status" className="mt-2 text-sm text-ink-muted">
        {shown.length === 1 ? "1 resultado" : `${shown.length} resultados`}
      </p>

      {shown.length === 0 && <p className="mt-4 rounded-2xl bg-surface p-6 text-center text-ink-muted shadow-soft">Nenhum studio ou parceiro com esse nome.</p>}

      <ul className="mt-4 flex flex-col gap-4">
        {shown.map((group) => (
          <li key={group.key} className="flex flex-col gap-4 rounded-3xl bg-surface p-5 shadow-soft sm:p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-display text-xl font-bold">
                {group.name}
                {group.kind === "partner" && <span className="ml-2 rounded-full bg-ink px-2.5 py-0.5 align-middle text-xs font-bold text-gold">Parceiro</span>}
              </h2>
              <p className="text-sm text-ink-muted">
                {group.referred.length === 1 ? "1 studio indicado" : `${group.referred.length} studios indicados`} ·{" "}
                {group.referred.filter(isActive).length} ativos
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
        ))}
      </ul>
    </>
  );
}
