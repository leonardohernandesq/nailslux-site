import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowSquareOutIcon, SignOutIcon } from "@phosphor-icons/react/ssr";
import { AdminNav } from "@/components/admin/admin-nav";
import { SetupBanner } from "@/components/admin/setup-banner";
import { logout } from "@/lib/actions/auth";
import { requireAdmin } from "@/lib/auth/dal";
import { getTenantById } from "@/lib/data/tenants";
import { canSendMail } from "@/lib/mail";

// The panel reads the session on every request, so navigations into it are allowed
// to wait on the server (opts these routes out of instant-navigation validation).
export const instant = false;

export default function PanelLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3 sm:px-6">
          <Link href="/admin/marcacoes" className="flex items-center gap-2" aria-label="Painel">
            <Image src="/brand/nailo/nailo-simbolo.svg" alt="" width={36} height={36} unoptimized className="size-9" />
            <span className="font-display text-2xl font-semibold">Painel</span>
          </Link>
          <div className="order-2 flex items-center gap-1 sm:order-3">
            <Suspense fallback={<div className="h-11 w-24" />}>
              <ViewSiteLink />
            </Suspense>
            <form action={logout}>
              <button
                type="submit"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-muted hover:bg-danger-soft hover:text-danger"
              >
                <SignOutIcon size={18} aria-hidden="true" />
                Sair
              </button>
            </form>
          </div>
          <div className="order-3 w-full border-t border-line/70 pt-2 sm:order-2 sm:w-auto sm:border-0 sm:pt-0">
            {/* usePathname() reads the URL, so it needs its own boundary. */}
            <Suspense fallback={<div className="h-11" />}>
              <AdminNav />
            </Suspense>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        <Suspense fallback={<p className="mb-2 h-6" />}>
          <Greeting />
        </Suspense>
        <Suspense>
          <PendingNotice />
        </Suspense>
        {/* Each page streams in behind its own loading.tsx boundary. */}
        {children}
      </main>
    </div>
  );
}

async function ViewSiteLink() {
  const { tenantSlug } = await requireAdmin();
  return (
    <Link
      href={`/${tenantSlug}`}
      target="_blank"
      className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-ink-muted hover:bg-peach-50 hover:text-ink"
    >
      <ArrowSquareOutIcon size={18} aria-hidden="true" />
      Ver site
    </Link>
  );
}

async function PendingNotice() {
  const { tenantId, email } = await requireAdmin();
  const tenant = await getTenantById(tenantId);
  if (!tenant) return null;

  const subscribed = tenant.subscriptionStatus === "active" || tenant.subscriptionStatus === "trialing";
  if (tenant.status === "pending") {
    return <SetupBanner email={email} emailConfirmed={tenant.emailConfirmed} subscribed={subscribed} confirmsEmail={canSendMail()} />;
  }
  if (tenant.status === "suspended" || tenant.subscriptionStatus === "past_due") {
    return (
      <p role="status" className="mb-6 rounded-2xl border border-danger/25 bg-danger-soft p-4 text-sm font-semibold text-danger">
        {tenant.status === "suspended" ? "O seu site está suspenso. " : "Não conseguimos cobrar a subscrição. "}
        <Link href="/admin/subscricao" className="underline">
          Ver subscrição
        </Link>
      </p>
    );
  }
  return null;
}

async function Greeting() {
  const user = await requireAdmin();
  return <p className="mb-2 text-sm text-ink-muted">Olá, {user.name.split(" ")[0]}!</p>;
}
