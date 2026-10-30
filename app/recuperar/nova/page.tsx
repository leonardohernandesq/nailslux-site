import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/platform/account-forms";
import { AuthShell } from "@/components/platform/auth-shell";

export const metadata: Metadata = { title: "Nova palavra-passe", robots: { index: false } };

async function Form({ searchParams }: Pick<PageProps<"/recuperar/nova">, "searchParams">) {
  const { token } = await searchParams;
  return <ResetPasswordForm token={typeof token === "string" ? token : ""} />;
}

export default function NewPasswordPage({ searchParams }: PageProps<"/recuperar/nova">) {
  return (
    <AuthShell title="Nova palavra-passe" intro="Escolha uma palavra-passe nova.">
      <Suspense fallback={<div className="h-40" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
