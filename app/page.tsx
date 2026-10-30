import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, ArrowSquareOutIcon } from "@phosphor-icons/react/ssr";
import { PageMotion } from "@/components/motion/page-motion";
import { BookingStory } from "@/components/platform/booking-story";
import { HeroDemo } from "@/components/platform/hero-demo";
import { LandingMotion } from "@/components/platform/landing-motion";
import { PanelTour } from "@/components/platform/panel-tour";
import { Pricing } from "@/components/platform/pricing";
import { SectionHeading } from "@/components/site/section-heading";
import { buttonClasses } from "@/components/ui/button";
import { sora } from "@/lib/fonts";
import { isRegistrationOpen, PLATFORM } from "@/lib/site";
import heroImage from "@/public/brand/hero-hands.webp";

export const metadata: Metadata = {
  title: { absolute: `${PLATFORM.name} · ${PLATFORM.description}` },
};

const EXAMPLE_STUDIO = "/nailslux";

const CORAL_ON_DARK = "bg-gradient-to-r from-[#ffb3a5] to-[#ff7a64] bg-clip-text font-bold text-transparent not-italic";

const FEATURES = [
  "Marcações online",
  "Pedidos no WhatsApp",
  "Agenda sem sobreposições",
  "Portfólio",
  "Moldes de cada cliente",
  "Estatísticas do site",
];

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#painel", label: "O painel" },
  { href: "#exemplo", label: "Exemplo real" },
  { href: "#preco", label: "Preço" },
];

export default function PlatformHome() {
  // The contact link is set per deployment, so no number is baked into the code.
  const contactUrl = process.env.PLATFORM_CONTACT_URL;
  const primaryCta = isRegistrationOpen()
    ? { href: "/registo", label: "Criar o meu site" }
    : contactUrl
      ? { href: contactUrl, label: "Quero para o meu studio" }
      : { href: EXAMPLE_STUDIO, label: "Ver um studio real" };

  return (
    <div className={`nailo ${sora.variable}`}>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-cream focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar para o conteúdo
      </a>

      <div className="relative overflow-hidden bg-ink text-cream">
        <span className="landing-aurora absolute -top-40 -left-32 size-[34rem] rounded-full bg-brand-rose/25 blur-3xl" />
        <span className="landing-aurora landing-aurora-alt absolute -right-32 bottom-0 size-[30rem] rounded-full bg-brand-amber/20 blur-3xl" />

        <header className="relative z-10 mx-auto flex h-20 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/" aria-label={`${PLATFORM.name}, início`} className="-ml-4">
            <Image
              src="/brand/nailo/nailo-logo-horizontal-negativo.svg"
              alt=""
              width={463}
              height={146}
              priority
              unoptimized
              className="h-14 w-auto"
            />
          </Link>
          <nav aria-label="Principal" className="hidden md:block">
            <ul className="flex items-center gap-1">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="rounded-full px-4 py-2 font-semibold text-cream/70 transition-colors hover:text-cream">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div className="flex items-center gap-1">
            <a href="#preco" className="inline-flex min-h-11 items-center rounded-full px-3 font-semibold text-cream/70 hover:text-cream md:hidden">
              Preço
            </a>
            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold ring-1 ring-cream/25 transition-colors hover:bg-cream hover:text-ink"
            >
              Entrar
            </Link>
          </div>
        </header>

        <section
          aria-labelledby="hero-title"
          className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-16 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pt-14 md:pb-24"
        >
          <div className="flex flex-col items-start gap-6">
            <p data-hero="item" className="rounded-full bg-cream/10 px-4 py-1.5 text-sm font-bold text-peach-200">
              Para studios de unhas
            </p>
            <h1
              id="hero-title"
              data-hero="item"
              className="font-display text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl lg:text-6xl"
            >
              A sua agenda a encher <em className={CORAL_ON_DARK}>enquanto trabalha.</em>
            </h1>
            <p data-hero="item" className="max-w-[48ch] text-cream/75 sm:text-lg">
              Um site só seu, onde as clientes veem os serviços e pedem uma hora livre. Os pedidos chegam ao WhatsApp e
              confirma tudo num painel simples.
            </p>
            <div data-hero="item" className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <a href={primaryCta.href} className={buttonClasses({ size: "lg" })}>
                {primaryCta.label}
                <ArrowRightIcon size={20} aria-hidden="true" />
              </a>
              <a
                href="#como-funciona"
                className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-lg font-semibold ring-1 ring-cream/25 transition-colors hover:bg-cream/10"
              >
                Ver como funciona
              </a>
            </div>
          </div>
          <HeroDemo />
        </section>

        <div aria-hidden="true" className="relative overflow-hidden border-t border-cream/10 py-4">
          <div className="landing-marquee flex w-max">
            {[...FEATURES, ...FEATURES].map((feature, index) => (
              <span key={index} className="px-6 text-lg font-semibold whitespace-nowrap text-cream/60">
                {feature} <span className="pl-10 text-brand-amber">✦</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <main id="conteudo">
        <section id="como-funciona" aria-labelledby="como-title" className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading id="como-title" eyebrow="Como funciona" title="Da cliente à sua agenda">
              Uma marcação, do primeiro toque à hora bloqueada.
            </SectionHeading>
            <BookingStory />
          </div>
        </section>

        <section id="painel" aria-labelledby="painel-title" className="relative overflow-hidden bg-ink py-16 text-cream sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <div data-reveal className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
              <p className="text-sm font-bold tracking-[0.18em] text-peach-200 uppercase">O painel</p>
              <h2 id="painel-title" className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                Tudo o que precisa, nada do que não usa
              </h2>
              <p className="mt-4 text-lg text-cream/70">Experimente: carregue em cada área.</p>
            </div>
            <div data-scroll-grow>
              <PanelTour />
            </div>
          </div>
        </section>

        <section id="exemplo" aria-labelledby="exemplo-title" className="py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <SectionHeading id="exemplo-title" eyebrow="Exemplo real" title="Veja um studio a funcionar">
              O NailsLux já recebe marcações neste sistema.
            </SectionHeading>
            <a
              href={EXAMPLE_STUDIO}
              data-scroll-grow
              className="group relative block aspect-[4/3] overflow-hidden rounded-3xl bg-peach-100 shadow-lift sm:aspect-[16/9]"
            >
              <Image
                src={heroImage}
                alt="Mãos com unhas arranjadas no studio NailsLux"
                fill
                sizes="(max-width: 1024px) 100vw, 960px"
                className="object-cover transition-[scale] duration-700 ease-(--ease-out-soft) group-hover:scale-105 motion-reduce:transition-none"
              />
              <span className="absolute inset-0 bg-gradient-to-t from-ink/70 to-transparent" />
              <span className="absolute right-5 bottom-5 left-5 flex items-center justify-between gap-3 text-cream">
                <span className="text-2xl font-bold sm:text-3xl">NailsLux</span>
                <span className="inline-flex min-h-11 items-center gap-2 rounded-full bg-cream px-4 font-semibold text-ink">
                  Abrir site
                  <ArrowSquareOutIcon size={18} aria-hidden="true" />
                </span>
              </span>
            </a>
          </div>
        </section>

        <section id="preco" aria-labelledby="preco-title" className="bg-glow py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <SectionHeading id="preco-title" eyebrow="Preço" title="Um preço simples, tudo incluído">
              Escolha pagar ao mês ou ao ano.
            </SectionHeading>
            <Pricing />
          </div>
        </section>

        <section aria-labelledby="final-title" className="px-4 pt-16 pb-16 sm:px-6 sm:pt-24 sm:pb-24">
          <div data-reveal className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-ink px-6 py-16 text-center text-cream sm:py-20">
            <span className="landing-aurora absolute -top-24 left-1/4 size-80 rounded-full bg-brand-flame/30 blur-3xl" />
            <h2 id="final-title" className="font-display relative text-3xl font-bold tracking-tight sm:text-5xl">
              Menos mensagens, <em className={CORAL_ON_DARK}>mais unhas.</em>
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-cream/75 sm:text-lg">
              Deixe as clientes marcarem sozinhas e fique com o tempo para o que faz melhor.
            </p>
            <a href={primaryCta.href} className={buttonClasses({ size: "lg", className: "relative mt-8" })}>
              {primaryCta.label}
              <ArrowRightIcon size={20} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-ink-muted sm:px-6">
          <p>© {PLATFORM.name}</p>
          <div className="flex flex-wrap items-center gap-x-5">
            <Link href="/termos" className="inline-flex min-h-11 items-center hover:text-accent">
              Termos
            </Link>
            <Link href="/privacidade" className="inline-flex min-h-11 items-center hover:text-accent">
              Privacidade
            </Link>
            <Link href="/admin" className="inline-flex min-h-11 items-center hover:text-accent">
              Área reservada
            </Link>
          </div>
        </div>
      </footer>

      <PageMotion />
      <LandingMotion />
    </div>
  );
}
