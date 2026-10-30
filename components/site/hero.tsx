import Image from "next/image";
import { SparkleIcon, WhatsappLogoIcon } from "@phosphor-icons/react/ssr";
import { buttonClasses } from "@/components/ui/button";
import { formatPhoneForDisplay } from "@/lib/site";
import heroImage from "@/public/brand/hero-hands.webp";

export function Hero({ whatsappNumber, brandAssets }: { whatsappNumber: string; brandAssets: boolean }) {
  return (
    <section
      aria-labelledby="hero-title"
      className="bg-glow relative overflow-hidden"
    >
      <div className={`mx-auto grid max-w-6xl items-center gap-7 px-4 pt-6 pb-12 sm:px-6 md:gap-10 md:py-20 lg:gap-16 ${
          brandAssets ? "md:grid-cols-[1.1fr_1fr]" : ""
        }`}>
        <div className="flex flex-col items-start gap-5 md:gap-6">
          <p
            data-hero="item"
            className="inline-flex items-center gap-2 rounded-full bg-surface px-4 py-1.5 text-sm font-bold text-accent shadow-soft"
          >
            <SparkleIcon size={16} weight="fill" aria-hidden="true" />
            Agenda aberta
          </p>
          <h1
            id="hero-title"
            data-hero="item"
            className="font-display text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl lg:text-7xl"
          >
            Unhas impecáveis,{" "}
            <em className="text-gradient-brand pr-1 font-bold">
              à sua maneira.
            </em>
          </h1>
          <p
            data-hero="item"
            className="max-w-[52ch] text-ink-muted sm:text-lg"
          >
            Cuidado, detalhe e estilo em cada unha. Escolha o serviço, a data e
            a hora — o pedido de marcação segue direto para o nosso WhatsApp.
          </p>
          <div
            data-hero="item"
            className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row"
          >
            <a href="#marcar" className={buttonClasses({ size: "lg" })}>
              Marcar horário
            </a>
            <a
              href="#portfolio"
              className={buttonClasses({ variant: "secondary", size: "lg" })}
            >
              Ver portfólio
            </a>
          </div>
          <a
            data-hero="item"
            data-track-whatsapp="hero"
            href={`https://wa.me/${whatsappNumber}`}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex min-h-12 items-center m-auto lg:m-0 gap-3 rounded-full bg-surface py-1.5 pr-5 pl-1.5 font-semibold text-ink shadow-soft transition-colors duration-200 hover:text-accent"
          >
            <span className="flex size-10 items-center justify-center rounded-full bg-peach-100 text-accent transition-colors duration-200 group-hover:bg-accent group-hover:text-on-accent">
              <WhatsappLogoIcon size={24} weight="fill" aria-hidden="true" />
            </span>
            <span className="sr-only">WhatsApp:</span>
            <span className="tabular-nums">
              {formatPhoneForDisplay(whatsappNumber)}
            </span>
          </a>
        </div>

        {/* On phones the photo leads (order-first), smaller and squarer so the title and
            main button still fit on the first screen. Side by side from md up. */}
        {brandAssets && (
        <div
          data-hero="image"
          className="relative order-first mx-auto w-full max-w-52 min-[375px]:max-w-56 sm:max-w-64 md:order-none md:max-w-sm lg:max-w-[26rem]"
        >
          <div
            aria-hidden="true"
            className="bg-gradient-brand absolute -inset-3 rounded-t-[999px] rounded-b-[2.5rem] opacity-25 blur-2xl"
          />
          <div className="relative overflow-hidden rounded-t-[999px] rounded-b-[2.5rem] border-[6px] border-surface shadow-lift">
            <Image
              src={heroImage}
              alt="Mão com unhas amendoadas em nude com brilho, feitas no studio"
              priority
              quality={90}
              placeholder="blur"
              sizes="(min-width: 1024px) 416px, (min-width: 768px) 384px, (min-width: 640px) 256px, (min-width: 375px) 224px, 208px"
              className="aspect-square w-full object-cover object-[30%_55%] md:aspect-4/5 md:object-[30%_50%]"
            />
          </div>
          <Image
            src="/brand/fox.png"
            alt=""
            width={279}
            height={339}
            data-hero="fox"
            className="absolute -bottom-4 -left-5 h-16 w-auto drop-shadow-md md:-bottom-6 md:-left-6 md:h-28"
          />
        </div>
        )}
      </div>
    </section>
  );
}
