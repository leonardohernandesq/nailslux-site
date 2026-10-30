import type { Metadata } from "next";
import { Suspense } from "react";
import { ConfirmEmailForm } from "@/components/platform/account-forms";
import { AuthShell } from "@/components/platform/auth-shell";

export const metadata: Metadata = { title: "Confirmar email", robots: { index: false } };

async function Form({ searchParams }: Pick<PageProps<"/registo/confirmar">, "searchParams">) {
  const { token } = await searchParams;
  return <ConfirmEmailForm token={typeof token === "string" ? token : ""} />;
}

export default function ConfirmPage({ searchParams }: PageProps<"/registo/confirmar">) {
  return (
    <AuthShell title="Confirmar email" intro="Depois disto, o seu site fica público.">
      <Suspense fallback={<div className="h-14" />}>
        <Form searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}
