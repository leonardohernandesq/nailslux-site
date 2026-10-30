import type { Metadata } from "next";
import { RequestResetForm } from "@/components/platform/account-forms";
import { AuthShell } from "@/components/platform/auth-shell";

export const metadata: Metadata = { title: "Recuperar palavra-passe" };

export default function RecoverPage() {
  return (
    <AuthShell title="Recuperar palavra-passe" intro="Enviamos um link para o seu email.">
      <RequestResetForm />
    </AuthShell>
  );
}
