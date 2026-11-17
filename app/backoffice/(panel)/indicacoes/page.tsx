import type { Metadata } from "next";
import { ReferralList } from "@/components/platform/referral-list";
import { getReferralOverview } from "@/lib/data/referrals";

export const metadata: Metadata = { title: "Indicações" };

// Auth-gated and per-request: allowed to block (see app/backoffice/(panel)/layout.tsx).
export const instant = false;

export default async function ReferralsPage() {
  const groups = await getReferralOverview();

  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">Indicações</h1>
      <p className="mt-1 text-ink-muted">
        Os parceiros e os studios publicados, cada um com o seu link, e os studios que vieram por ele. Os meses pagos vêm das faturas da
        Stripe.
      </p>
      <ReferralList groups={groups} />
    </>
  );
}
