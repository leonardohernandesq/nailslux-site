import Image from "next/image";
import Link from "next/link";
import { sora } from "@/lib/fonts";
import { PLATFORM } from "@/lib/site";

/** `id` gives the section an anchor, for links that point straight at it. */
export type LegalSection = { id?: string; title: string; body: string[] };

const UPDATED = "17 de novembro de 2026";

/** Long-form text pages, such as the terms and the privacy policy. */
export function LegalPage({ title, sections }: { title: string; sections: LegalSection[] }) {
  // The contact link is set per deployment, so no number is baked into the code.
  const contactUrl = process.env.PLATFORM_CONTACT_URL;

  return (
    <main className={`nailo min-h-dvh px-4 py-10 sm:py-14 ${sora.variable}`}>
      <article className="mx-auto max-w-2xl">
        <Link href="/" aria-label={`${PLATFORM.name}, início`} className="inline-block">
          <Image src="/brand/nailo/nailo-logo-horizontal.svg" alt="" width={463} height={146} priority unoptimized className="h-14 w-auto" />
        </Link>
        <h1 className="font-display mt-6 text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-ink-muted">Versão provisória, atualizada a {UPDATED}.</p>

        {sections.map((section) => (
          <section key={section.title} id={section.id} className="mt-8 scroll-mt-6">
            <h2 className="font-display text-xl font-bold">{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph} className="mt-2 text-ink-muted">
                {paragraph}
              </p>
            ))}
          </section>
        ))}

        <section className="mt-8">
          <h2 className="font-display text-xl font-bold">Contacto</h2>
          <p className="mt-2 text-ink-muted">
            Para qualquer questão, incluindo pedidos sobre dados pessoais, escreva para{" "}
            <a href={`mailto:${PLATFORM.contactEmail}`} className="font-semibold text-accent underline wrap-anywhere">
              {PLATFORM.contactEmail}
            </a>{" "}
            ou use o{" "}
            <Link href="/contacto" className="font-semibold text-accent underline">
              formulário de contacto
            </Link>
            .
            {contactUrl && (
              <>
                {" "}
                Também pode{" "}
                <a href={contactUrl} className="font-semibold text-accent underline">
                  falar connosco
                </a>
                .
              </>
            )}
          </p>
        </section>
      </article>
    </main>
  );
}
