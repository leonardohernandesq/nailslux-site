import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, GiftIcon } from "@phosphor-icons/react/ssr";
import { PageMotion } from "@/components/motion/page-motion";
import { BookingStory } from "@/components/platform/booking-story";
import { Faq } from "@/components/platform/faq";
import { FeatureBento } from "@/components/platform/feature-bento";
import { HeroDemo } from "@/components/platform/hero-demo";
import { LandingMotion } from "@/components/platform/landing-motion";
import { PanelTour } from "@/components/platform/panel-tour";
import { Pricing } from "@/components/platform/pricing";
import { StudioCarousel } from "@/components/platform/studio-carousel";
import { TESTIMONIALS, Testimonials } from "@/components/platform/testimonials";
import { SectionHeading } from "@/components/site/section-heading";
import { buttonClasses } from "@/components/ui/button";
import { PORTFOLIO_MAX_ITEMS } from "@/lib/constants";
import { getShowcaseStudios } from "@/lib/data/showcase";
import { instrumentSerif, sora } from "@/lib/fonts";
import { PLANS } from "@/lib/plans";
import { isRegistrationOpen, PLATFORM } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${PLATFORM.name} · ${PLATFORM.description}` },
};

const EXAMPLE_STUDIO = "/nailslux";

/** The italic serif accent used for a few words in each heading. */
const LUXE = "font-luxe font-normal italic";
const LUXE_ON_DARK = `${LUXE} text-gradient-luxe pr-1`;
const LUXE_ON_LIGHT = `${LUXE} text-accent`;

const FEATURES = [
  "Marcações online",
  "Pedidos no WhatsApp",
  "Agenda sem sobreposições",
  "Ficha de cada cliente",
  "Agenda no seu calendário",
  "Aviso de pedidos por email",
  "Portfólio",
  "Estatísticas do site",
];

const NAV = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#painel", label: "O painel" },
  { href: "#studios", label: "Studios" },
  { href: "#preco", label: "Preço" },
];

const MONTHLY_PRICE = (PLANS[0].priceCents / 100).toLocaleString("pt-PT", { minimumFractionDigits: 2 });

// Facts about the product, not vanity numbers; each one has to stay true.
const NUMBERS = [
  { value: "24", count: 24, unit: "h", label: "a receber pedidos, todos os dias" },
  { value: String(PORTFOLIO_MAX_ITEMS), count: PORTFOLIO_MAX_ITEMS, unit: "", label: "fotografias no seu portfólio" },
  { value: MONTHLY_PRICE, count: PLANS[0].priceCents / 100, decimals: 2, unit: " €", label: "por mês + IVA, tudo incluído" },
];

// Specks of champagne drifting up behind the closing call to action.
const DUST = [
  { left: "12%", top: "70%", dx: "14px", dur: "9s", delay: "0s" },
  { left: "24%", top: "40%", dx: "-10px", dur: "11s", delay: "2s" },
  { left: "38%", top: "80%", dx: "8px", dur: "8s", delay: "4s" },
  { left: "55%", top: "30%", dx: "-12px", dur: "12s", delay: "1s" },
  { left: "68%", top: "75%", dx: "10px", dur: "10s", delay: "3s" },
  { left: "82%", top: "45%", dx: "-8px", dur: "9s", delay: "5s" },
  { left: "90%", top: "70%", dx: "12px", dur: "13s", delay: "2.5s" },
];

/** Splits a phrase into words that rise in one after another (globals.css). A text
 *  gradient goes on each word: clipped from a parent, it can vanish while they move. */
function Words({ text, from = 0, className = "" }: { text: string; from?: number; className?: string }) {
  return text.split(" ").map((word, index, words) => (
    <span key={index}>
      <span data-hero-word className={className} style={{ "--i": from + index } as React.CSSProperties}>
        {word}
      </span>
      {index < words.length - 1 && " "}
    </span>
  ));
}

export default async function PlatformHome() {
  const studios = await getShowcaseStudios();
  // The contact link is set per deployment, so no number is baked into the code.
  const contactUrl = process.env.PLATFORM_CONTACT_URL;
  const primaryCta = isRegistrationOpen()
    ? { href: "/registo", label: "Criar o meu site" }
    : contactUrl
      ? { href: contactUrl, label: "Quero para o meu studio" }
      : { href: EXAMPLE_STUDIO, label: "Ver um studio real" };

  return (
    <div className={`nailo nailo-luxe ${sora.variable} ${instrumentSerif.variable}`}>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-cream focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar para o conteúdo
      </a>

      <div data-cursor-glow className="grain relative overflow-hidden bg-[var(--ink-deep)] text-cream">
        <span className="landing-aurora absolute -top-40 -left-32 size-[34rem] rounded-full bg-brand-rose/25 blur-3xl" />
        <span className="landing-aurora landing-aurora-alt absolute -right-32 bottom-0 size-[30rem] rounded-full bg-brand-amber/20 blur-3xl" />
        <span className="landing-aurora absolute top-1/3 left-1/2 size-[22rem] rounded-full bg-gold/10 blur-3xl" />
        <span
          data-cursor-glow-dot
          aria-hidden="true"
          className="pointer-events-none invisible absolute top-0 left-0 -mt-64 -ml-64 size-[32rem] rounded-full bg-[radial-gradient(circle,rgb(217_185_138/0.16),transparent_65%)] opacity-0"
        />

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
                  <a href={item.href} className="rounded-full px-4 py-2 font-semibold text-cream/70 transition-colors hover:text-gold">
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
              className="inline-flex min-h-11 items-center rounded-full px-4 font-semibold ring-1 ring-gold/40 transition-colors hover:bg-gold hover:text-ink"
            >
              Entrar
            </Link>
          </div>
        </header>

        <section
          aria-labelledby="hero-title"
          className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 pt-8 pb-16 sm:px-6 md:grid-cols-[1.15fr_1fr] md:pt-14 md:pb-24"
        >
          <div className="flex flex-col items-start gap-6">
            <p
              data-hero="item"
              className="inline-flex items-center gap-2 rounded-full bg-cream/5 px-4 py-1.5 text-sm font-bold tracking-wide text-gold ring-1 ring-gold/30"
            >
              <span aria-hidden="true">✦</span> Para studios de unhas
            </p>
            <h1 id="hero-title" className="font-display text-4xl leading-[1.08] font-bold tracking-tight sm:text-5xl lg:text-6xl">
              <Words text="A sua agenda a encher" />{" "}
              <em className={`${LUXE} text-[1.18em] leading-none`}>
                <Words text="enquanto trabalha." from={5} className="text-gradient-luxe pr-1" />
              </em>
            </h1>
            <p data-hero="item" className="max-w-[48ch] text-cream/75 sm:text-lg">
              Um site só seu, onde as clientes veem os serviços e pedem uma hora livre. Os pedidos chegam ao WhatsApp e
              confirma tudo num painel simples.
            </p>
            <div data-hero="item" className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <a data-magnetic href={primaryCta.href} className={buttonClasses({ size: "lg", className: "shadow-[0_10px_40px_-10px_rgb(229_83_61/0.7)]" })}>
                {primaryCta.label}
                <ArrowRightIcon size={20} aria-hidden="true" />
              </a>
              <a
                data-magnetic
                href="#como-funciona"
                className="inline-flex min-h-14 items-center justify-center rounded-full px-8 text-lg font-semibold ring-1 ring-cream/25 transition-colors hover:bg-cream/10 hover:ring-gold/60"
              >
                Ver como funciona
              </a>
            </div>
          </div>
          <div data-tilt="5">
            <HeroDemo />
          </div>
        </section>

        <div aria-hidden="true" className="relative z-10 overflow-hidden border-y border-gold/15 py-5">
          <div data-marquee className="landing-marquee flex w-max">
            {[...FEATURES, ...FEATURES].map((feature, index) => (
              <span key={index} className="font-luxe px-6 text-2xl whitespace-nowrap text-cream/70 italic sm:text-3xl">
                {feature} <span className="pl-10 text-gold not-italic">✦</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <main id="conteudo">
        <section aria-label="O Nailo App em números" className="border-b border-line bg-surface">
          <ul data-reveal-group className="mx-auto grid max-w-5xl gap-y-8 px-4 py-12 sm:grid-cols-3 sm:px-6 md:py-14">
            {NUMBERS.map(({ value, count, decimals, unit, label }) => (
              <li key={label} className="flex flex-col items-center px-3 text-center sm:border-l sm:border-line sm:first:border-l-0">
                <p className="font-luxe text-5xl leading-none text-ink tabular-nums sm:text-6xl">
                  <span data-count={count} data-count-decimals={decimals}>
                    {value}
                  </span>
                  <span className="text-gold-deep">{unit}</span>
                </p>
                <p className="mt-2 max-w-[18ch] text-sm font-semibold text-ink-muted">{label}</p>
              </li>
            ))}
          </ul>
        </section>

        <section id="como-funciona" aria-labelledby="como-title" className="py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading id="como-title" eyebrow="Como funciona" title={<>Da cliente <em className={LUXE_ON_LIGHT}>à sua agenda</em></>}>
              Uma marcação, do primeiro toque à hora bloqueada.
            </SectionHeading>
            <BookingStory />
          </div>
        </section>

        <section id="funcionalidades" aria-labelledby="funcionalidades-title" className="bg-glow pb-16 sm:pb-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <SectionHeading
              id="funcionalidades-title"
              eyebrow="Tudo incluído"
              title={<>Pensado ao pormenor, <em className={LUXE_ON_LIGHT}>como as suas unhas</em></>}
            >
              Tudo o que um studio precisa para receber marcações, num só sítio.
            </SectionHeading>
            <FeatureBento />
          </div>
        </section>

        <section id="painel" aria-labelledby="painel-title" className="grain relative overflow-hidden bg-[var(--ink-deep)] py-16 text-cream sm:py-24">
          <span className="landing-aurora absolute -top-32 right-0 size-[28rem] rounded-full bg-brand-flame/15 blur-3xl" />
          <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
            <div data-reveal className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
              <p className="text-sm font-bold tracking-[0.18em] text-gold uppercase">O painel</p>
              <h2 id="painel-title" className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
                Tudo o que precisa, <em className={LUXE_ON_DARK}>nada do que não usa</em>
              </h2>
              <p className="mt-4 text-lg text-cream/70">Experimente: carregue em cada área.</p>
            </div>
            <div data-scroll-grow>
              <div data-sheen className="sheen relative rounded-3xl ring-1 ring-gold/25">
                <PanelTour />
              </div>
            </div>
          </div>
        </section>

        {studios.length > 0 && (
          <section id="studios" aria-labelledby="studios-title" className="py-16 sm:py-24">
            <div className="mx-auto max-w-5xl px-4 sm:px-6">
              <SectionHeading
                id="studios-title"
                eyebrow="Studios Nailo"
                title={<>Os studios que já fazem <em className={LUXE_ON_LIGHT}>parte do nosso time</em></>}
              >
                Conheça quem já recebe marcações com o {PLATFORM.name}.
              </SectionHeading>
              <div data-reveal>
                <StudioCarousel studios={studios} invite={primaryCta} />
              </div>
            </div>
          </section>
        )}

        {TESTIMONIALS.length > 0 && (
          <section aria-labelledby="testemunhos-title" className="grain relative overflow-hidden bg-[var(--ink-deep)] py-16 text-cream sm:py-24">
            <div className="relative z-10 mx-auto max-w-5xl px-4 sm:px-6">
              <div className="mx-auto mb-10 max-w-2xl text-center sm:mb-14">
                <p className="text-sm font-bold tracking-[0.18em] text-gold uppercase">Testemunhos</p>
                <h2 id="testemunhos-title" className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-5xl">
                  Quem usa, <em className={LUXE_ON_DARK}>recomenda</em>
                </h2>
              </div>
              <Testimonials />
            </div>
          </section>
        )}

        <section id="preco" aria-labelledby="preco-title" className="bg-glow py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <SectionHeading id="preco-title" eyebrow="Preço" title={<>Um preço simples, <em className={LUXE_ON_LIGHT}>tudo incluído</em></>}>
              Escolha pagar ao mês ou ao ano.
            </SectionHeading>
            <Pricing />
          </div>
        </section>

        <section aria-labelledby="indicar-title" className="px-4 pb-16 sm:px-6 sm:pb-24">
          <div
            data-reveal
            className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 overflow-hidden rounded-[2rem] bg-surface p-8 text-center shadow-soft ring-1 ring-line sm:p-12 md:flex-row md:text-left"
          >
            <span aria-hidden="true" className="absolute -right-16 -bottom-20 size-64 rounded-full bg-gold/15 blur-3xl" />
            <span aria-hidden="true" className="relative grid size-20 shrink-0 place-items-center rounded-full bg-ink text-gold shadow-lift">
              <GiftIcon size={40} weight="duotone" />
            </span>
            <div className="relative flex-1">
              <p className="text-sm font-bold tracking-[0.18em] text-accent uppercase">Indique e ganhe</p>
              <h2 id="indicar-title" className="font-display mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
                Um mês grátis <em className={LUXE_ON_LIGHT}>para os dois studios</em>
              </h2>
              <p className="mt-2 max-w-[52ch] text-ink-muted">
                Cada studio tem um link para partilhar. Quando outro studio cria o site por esse link e ativa a subscrição,
                ganham os dois um mês sem pagar.
              </p>
            </div>
          </div>
        </section>

        <section id="perguntas" aria-labelledby="perguntas-title" className="pb-16 sm:pb-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6">
            <SectionHeading id="perguntas-title" eyebrow="Perguntas frequentes" title={<>Ainda com <em className={LUXE_ON_LIGHT}>dúvidas?</em></>} />
            <Faq />
          </div>
        </section>

        <section aria-labelledby="final-title" className="px-4 pb-16 sm:px-6 sm:pb-24">
          <div
            data-reveal
            className="grain gold-ring relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] bg-[var(--ink-deep)] px-6 py-16 text-center text-cream sm:py-24"
          >
            <span className="landing-aurora absolute -top-24 left-1/4 size-80 rounded-full bg-brand-flame/30 blur-3xl" />
            <span className="landing-aurora landing-aurora-alt absolute -right-10 -bottom-24 size-72 rounded-full bg-gold/15 blur-3xl" />
            {DUST.map(({ left, top, dx, dur, delay }) => (
              <span
                key={left}
                aria-hidden="true"
                style={{ left, top, "--dx": dx, "--dur": dur, "--delay": delay } as React.CSSProperties}
                className="gold-dust absolute size-1.5 rounded-full bg-gold opacity-0 shadow-[0_0_10px_2px_rgb(217_185_138/0.6)]"
              />
            ))}
            <h2 id="final-title" className="font-display relative text-3xl font-bold tracking-tight sm:text-5xl">
              Menos mensagens, <em className={`${LUXE_ON_DARK} text-[1.15em]`}>mais unhas.</em>
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-cream/75 sm:text-lg">
              Deixe as clientes marcarem sozinhas e fique com o tempo para o que faz melhor.
            </p>
            <a data-magnetic href={primaryCta.href} className={buttonClasses({ size: "lg", className: "relative mt-8" })}>
              {primaryCta.label}
              <ArrowRightIcon size={20} aria-hidden="true" />
            </a>
          </div>
        </section>
      </main>

      <footer className="grain relative overflow-hidden bg-[var(--ink-deep)] text-cream">
        <div className="relative z-10 mx-auto grid max-w-6xl gap-10 px-4 pt-14 pb-8 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Image src="/brand/nailo/nailo-logo-horizontal-negativo.svg" alt={PLATFORM.name} width={463} height={146} unoptimized className="-ml-3 h-12 w-auto" />
            <p className="font-luxe mt-4 max-w-xs text-2xl leading-snug text-cream/80 italic">{PLATFORM.description}</p>
          </div>
          <nav aria-label="Rodapé">
            <p className="text-sm font-bold tracking-[0.18em] text-gold uppercase">Explorar</p>
            <ul className="mt-3">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="inline-flex min-h-11 items-center text-cream/70 transition-colors hover:text-gold">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
          <div>
            <p className="text-sm font-bold tracking-[0.18em] text-gold uppercase">Studio</p>
            <ul className="mt-3">
              <li>
                <a href={primaryCta.href} className="inline-flex min-h-11 items-center text-cream/70 transition-colors hover:text-gold">
                  {primaryCta.label}
                </a>
              </li>
              <li>
                <Link href="/admin" className="inline-flex min-h-11 items-center text-cream/70 transition-colors hover:text-gold">
                  Área reservada
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="relative z-10 border-t border-gold/15">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-sm text-cream/60 sm:px-6">
            <p>© {PLATFORM.name}</p>
            <div className="flex flex-wrap items-center gap-x-5">
              <Link href="/termos" className="inline-flex min-h-11 items-center hover:text-gold">
                Termos
              </Link>
              <Link href="/privacidade" className="inline-flex min-h-11 items-center hover:text-gold">
                Privacidade
              </Link>
            </div>
          </div>
        </div>
      </footer>

      <PageMotion />
      <LandingMotion />
    </div>
  );
}
