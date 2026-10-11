import { AnalyticsTracker } from "@/components/analytics/analytics-tracker";
import { BookNowDialog } from "@/components/booking/book-now-dialog";
import { BookingForm } from "@/components/booking/booking-form";
import { BookingProvider } from "@/components/booking/booking-context";
import { SelectionBar } from "@/components/booking/selection-bar";
import { PageMotion } from "@/components/motion/page-motion";
import { Hero } from "@/components/site/hero";
import { HowItWorks } from "@/components/site/how-it-works";
import { PortfolioSection } from "@/components/site/portfolio-section";
import { SectionHeading } from "@/components/site/section-heading";
import { ServicesSection } from "@/components/site/services-section";
import { SiteFooter } from "@/components/site/site-footer";
import { SiteHeader } from "@/components/site/site-header";
import { getPublicPortfolio } from "@/lib/data/portfolio";
import { getPublicServices } from "@/lib/data/services";
import { OPENING_HOURS, getInstagramUrl, getStudioAddress, getWhatsAppNumber } from "@/lib/site";

// Services and photos are cached (`use cache` + tags) and refreshed whenever the
// admin changes them, so this page is served from the static shell.
export default async function HomePage() {
  const [services, portfolio] = await Promise.all([getPublicServices(), getPublicPortfolio()]);
  const whatsappNumber = getWhatsAppNumber();
  const instagramUrl = getInstagramUrl();

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-cream focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar para o conteúdo
      </a>
      <SiteHeader />
      <BookingProvider services={services}>
        <main id="conteudo">
          <Hero whatsappNumber={whatsappNumber} />
          <ServicesSection services={services} />
          <HowItWorks />
          <PortfolioSection items={portfolio} instagramUrl={instagramUrl} />
          <section id="marcar" aria-labelledby="marcar-title" className="bg-glow py-16 pb-28 sm:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <SectionHeading id="marcar-title" eyebrow="Marcação" title="Marque o seu horário">
                Preencha os dados e a mensagem abre no WhatsApp, pronta a enviar.
              </SectionHeading>
              <div data-reveal>
                <BookingForm whatsappNumber={whatsappNumber} hours={OPENING_HOURS} />
              </div>
            </div>
          </section>
        </main>
        <SelectionBar />
        <BookNowDialog targetId="marcar" headingId="marcar-title" />
      </BookingProvider>
      <SiteFooter
        whatsappNumber={whatsappNumber}
        instagramUrl={instagramUrl}
        address={getStudioAddress()}
      />
      <PageMotion />
      <AnalyticsTracker />
    </>
  );
}
