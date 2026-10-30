import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BillingButton } from "@/components/admin/billing-button";
import { requireAdmin } from "@/lib/auth/dal";
import { MANAGED_IN_PORTAL } from "@/lib/billing/subscription";
import { getTenantById } from "@/lib/data/tenants";

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

export default async function BillingPage({ searchParams }: PageProps<"/admin/subscricao">) {
  const { tenantId } = await requireAdmin();
  const tenant = await getTenantById(tenantId);
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
            <p className="text-sm text-ink-muted">O pagamento é feito na Stripe. Os dados do cartão nunca passam pelos nossos servidores.</p>
            <BillingButton label={canSubscribe ? "Ativar subscrição" : "Gerir subscrição"} choosePlan={canSubscribe} />
          </>
        )}
      </div>
    </>
  );
}
