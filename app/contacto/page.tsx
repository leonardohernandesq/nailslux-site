import type { Metadata } from "next";
import { ContactForm } from "@/components/platform/contact-form";
import { AuthShell } from "@/components/platform/auth-shell";

export const metadata: Metadata = {
  title: "Contacto",
  description: "Sugestões, reclamações, observações e agradecimentos sobre o seu site.",
};

export default function ContactPage() {
  return (
    <AuthShell wide title="Fale connosco" intro="Uma ideia para o seu site, algo que correu mal ou um obrigado: lemos tudo.">
      <ContactForm />
    </AuthShell>
  );
}
