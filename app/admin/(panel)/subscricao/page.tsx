import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarBlankIcon, CreditCardIcon, GiftIcon, HourglassMediumIcon } from "@phosphor-icons/react/ssr";
import { BillingButton } from "@/components/admin/billing-button";
import { ReferralCard } from "@/components/admin/referral-card";
import { requireAdmin } from "@/lib/auth/dal";
import { daysUntil, getSubscriptionDetails, type SubscriptionDetails } from "@/lib/billing/details";
import { getReferredStudios, referralUrl } from "@/lib/billing/referral";
import { MANAGED_IN_PORTAL } from "@/lib/billing/subscription";
import { getTenantById } from "@/lib/data/tenants";
import { formatPrice } from "@/lib/format";

export const metadata: Metadata = { title: "Subscrição" };

// Auth-gated and per-request: allowed to block (see app/admin/(panel)/layout.tsx).
export const instant = false;

const STATUS: Record<string, { label: string; text: string }> = {
  active: { label: "Ativa", text: "A sua subscrição está em dia." },
  trialing: { label: "Ativa", text: "A sua subscrição está em dia." },
  past_due: { label: "Pagamento em falta", text: "Não conseguimos cobrar a subscrição. O site continua online enquanto tentamos de novo: atualize o método de pagamento." },
  unpaid: { label: "Por pagar", text: "O seu site foi suspenso. Regularize o pagamento para voltar a ficar online." },
  canceled: { label: "Cancelada", text: "A subscrição terminou. Subscreva de novo para voltar a ficar online." },
};

const longDate = new Intl.DateTimeFormat("pt-PT", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Lisbon" });

export default async function BillingPage({ searchParams }: PageProps<"/admin/subscricao">) {
  const { tenantId } = await requireAdmin();
  const [tenant, details, referred] = await Promise.all([
    getTenantById(tenantId),
    getSubscriptionDetails(tenantId),
    getReferredStudios(tenantId),
  ]);
  if (!tenant) notFound();
  const { pago } = await searchParams;

  // Studios billed outside Stripe, like the first client.
  const billedDirectly = tenant.status === "active" && !tenant.hasBillingAccount;
  const status = tenant.subscriptionStatus ? STATUS[tenant.subscriptionStatus] : undefined;
  const paying = tenant.subscriptionStatus === "active" || tenant.subscriptionStatus === "trialing";
  const canSubscribe = !MANAGED_IN_PORTAL.includes(tenant.subscriptionStatus ?? "");

  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight">Subscrição</h1>
      <div className="mt-6 flex flex-col items-start gap-4 rounded-3xl bg-surface p-5 shadow-soft sm:p-8">
        {billedDirectly ? (
          <p>A sua conta não precisa de subscrição online. Fale connosco para qualquer alteração.</p>
        ) : (
          <>
            {/* The webhook usually arrives first, but the return page can beat it. */}
            {pago && !paying && <p role="status" className="font-semibold">Pagamento recebido. Estamos a ativar a sua subscrição, atualize a página daqui a pouco.</p>}
            <p className="text-sm font-bold text-ink-muted">Estado: {status?.label ?? "Por ativar"}</p>
            <p>{status?.text ?? "Ative a subscrição para publicar o seu site."}</p>
            {details && details.status !== "canceled" && <Summary details={details} />}
            <p className="text-sm text-ink-muted">O pagamento é feito na Stripe. Os dados do cartão nunca passam pelos nossos servidores.</p>
            <BillingButton label={canSubscribe ? "Ativar subscrição" : "Gerir subscrição"} choosePlan={canSubscribe} />
          </>
        )}
      </div>
      <ReferralCard url={referralUrl(tenant.slug)} referred={referred} active={tenant.status === "active"} billedDirectly={billedDirectly} />
    </>
  );
}

/** Days left, the date, and what happens then. */
function Summary({ details }: { details: SubscriptionDetails }) {
  const days = daysUntil(details.nextDate);
  const date = longDate.format(new Date(details.nextDate));
  const daysLabel = days === 1 ? "1 dia" : `${days} dias`;
  const headline = details.ending ? `Termina em ${daysLabel}` : details.free ? `Grátis durante mais ${daysLabel}` : `Renova em ${daysLabel}`;
  const detail = details.ending
    ? `A subscrição foi cancelada e o site fica online até ${date}.`
    : details.free && !details.hasCard
      ? `Tem acesso gratuito até ${date}. Para continuar depois disso, adicione um cartão em Gerir subscrição.`
      : details.free
        ? `Sem custos até ${date}. A primeira cobrança do plano ${details.plan} é nesse dia.`
        : `Próxima cobrança do plano ${details.plan} a ${date}.`;

  return (
    <dl className="grid w-full gap-3 sm:grid-cols-2">
      <div className="flex items-start gap-3 rounded-2xl bg-peach-50 p-4 sm:col-span-2">
        {details.ending ? (
          <HourglassMediumIcon size={28} weight="duotone" aria-hidden="true" className="shrink-0 text-accent" />
        ) : details.free ? (
          <GiftIcon size={28} weight="duotone" aria-hidden="true" className="shrink-0 text-accent" />
        ) : (
          <CalendarBlankIcon size={28} weight="duotone" aria-hidden="true" className="shrink-0 text-accent" />
        )}
        <div>
          <dt className="sr-only">Próxima data</dt>
          <dd className="font-display text-2xl font-bold">{headline}</dd>
          <dd className="text-sm text-ink-muted">{detail}</dd>
        </div>
      </div>
      {details.creditCents > 0 && (
        <div className="flex items-center gap-3 rounded-2xl bg-success-soft p-4 text-success sm:col-span-2">
          <CreditCardIcon size={24} aria-hidden="true" className="shrink-0" />
          <div>
            <dt className="text-sm font-bold">Crédito a seu favor</dt>
            <dd className="font-semibold">{formatPrice(details.creditCents)}, descontado nas próximas faturas.</dd>
          </div>
        </div>
      )}
    </dl>
  );
}
