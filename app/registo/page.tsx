import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/platform/auth-shell";
import { RegisterForm } from "@/components/platform/register-form";
import { buttonClasses } from "@/components/ui/button";
import { isRegistrationOpen } from "@/lib/site";

export const metadata: Metadata = { title: "Criar conta" };

export default function RegisterPage() {
  if (!isRegistrationOpen()) {
    return (
      <AuthShell title="Em breve" intro="Os registos ainda não estão abertos.">
        <Link href="/" className={buttonClasses({ className: "w-full" })}>
          Voltar ao início
        </Link>
      </AuthShell>
    );
  }

  const siteHost = new URL(process.env.SITE_URL ?? "http://localhost:3000").host;
  return (
    <AuthShell title="Crie o site do seu studio" intro="Fica pronto a configurar em poucos minutos.">
      <RegisterForm siteHost={siteHost} />
      <p className="mt-5 text-center text-sm">
        Já tem conta?{" "}
        <Link href="/admin/login" className="font-semibold text-accent hover:underline">
          Entrar
        </Link>
      </p>
    </AuthShell>
  );
}
