import type { Metadata } from "next";
import { AuthShell } from "@/components/platform/auth-shell";
import { PlatformLoginForm } from "@/components/platform/platform-login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function PlatformLoginPage() {
  return (
    <AuthShell title="Backoffice" intro="Acesso da equipa da plataforma.">
      <PlatformLoginForm />
    </AuthShell>
  );
}
