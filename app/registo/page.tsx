import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { AuthShell } from "@/components/platform/auth-shell";
import { RegisterForm } from "@/components/platform/register-form";
import { buttonClasses } from "@/components/ui/button";
import { GiftIcon } from "@phosphor-icons/react/ssr";
import { findReferrer } from "@/lib/billing/referral";
import { toPlan } from "@/lib/plans";
import { isRegistrationOpen } from "@/lib/site";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage({ searchParams }: PageProps<"/registo">) {
  if (!isRegistrationOpen()) {
    return (
      <AuthShell title="Em breve" intro="Os registos ainda não estão abertos.">
        <Link href="/" className={buttonClasses({ className: "w-full" })}>
          Voltar ao início
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Crie o site do seu studio" intro="Escolha o plano, crie a conta e pague em segurança.">
      <Suspense fallback={<div className="min-h-[36rem]" />}>
        <RegisterWithPlan searchParams={searchParams} />
      </Suspense>
      <p className="mt-5 text-center text-sm">
        Já tem conta?{" "}
        <Link href="/admin/login" className="font-semibold text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}

// The plan comes from the link on the landing page, read per request.
async function RegisterWithPlan({ searchParams }: Pick<PageProps<"/registo">, "searchParams">) {
  const { plano, ref } = await searchParams;
  const siteHost = new URL(process.env.SITE_URL ?? "http://localhost:3000").host;
  // The invite is looked up in the database, so this part renders per request.
  await connection();
  const referrer = await findReferrer(ref);
  return (
    <>
      {referrer && (
        <p role="status" className="mb-5 flex items-start gap-3 rounded-2xl bg-peach-50 p-4 text-sm">
          <GiftIcon size={22} weight="duotone" aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
          <span>
            Convite do studio <strong>{referrer.name}</strong>: quando a sua subscrição ficar ativa, ganha{" "}
            <strong>um mês grátis</strong>.
          </span>
        </p>
      )}
      <RegisterForm siteHost={siteHost} plan={toPlan(plano).id} referralCode={referrer ? String(ref) : undefined} />
    </>
  );
}
