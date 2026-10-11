import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <main className="bg-glow flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image src="/brand/fox.png" alt="" width={279} height={339} priority className="h-20 w-auto" />
          <h1 className="font-display mt-4 text-4xl font-semibold">Área reservada</h1>
          <p className="mt-1 text-ink-muted">Entre para gerir serviços e portfólio.</p>
        </div>
        <div className="rounded-3xl bg-surface p-6 shadow-soft sm:p-8">
          <LoginForm />
        </div>
        <p className="mt-6 text-center">
          <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-accent hover:underline">
            Voltar ao site
          </Link>
        </p>
      </div>
    </main>
  );
}
