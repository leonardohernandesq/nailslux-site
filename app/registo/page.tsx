import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AuthShell } from "@/components/platform/auth-shell";
import { RegisterForm } from "@/components/platform/register-form";
import { buttonClasses } from "@/components/ui/button";
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
  const { plano } = await searchParams;
  const siteHost = new URL(process.env.SITE_URL ?? "http://localhost:3000").host;
  return <RegisterForm siteHost={siteHost} plan={toPlan(plano).id} />;
}
