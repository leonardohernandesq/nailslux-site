import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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
import { getActiveTenant, getActiveTenantSlugs } from "@/lib/data/tenants";
import { hasBrandAssets } from "@/lib/site";

// Cache Components needs at least one param to validate the route at build time;
// this is the fallback for a database with no studios yet. Studios that join later
// render on their first visit, with no new deploy.
const SAMPLE_SLUG = "nailslux";

export async function generateStaticParams() {
  const slugs = await getActiveTenantSlugs();
  return (slugs.length > 0 ? slugs : [SAMPLE_SLUG]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const tenant = await getActiveTenant((await params).slug);
  if (!tenant) return {};

  const title = `${tenant.name} · ${tenant.tagline}`;
  return {
    title: { absolute: title },
    description: tenant.description,
    // Studio sites keep their own icon; the platform's is set in the root layout.
    icons: { icon: "/brand/studio-icon.png", apple: "/brand/studio-apple-icon.png" },
    openGraph: {
      type: "website",
      locale: "pt_PT",
      siteName: tenant.name,
      title,
      description: tenant.description,
      ...(hasBrandAssets(tenant.slug) && {
        images: [{ url: "/brand/logo-full.png", width: 900, height: 587, alt: tenant.name }],
      }),
    },
  };
}

export default function StudioPage({ params }: PageProps<"/[slug]">) {
  return (
    <Suspense fallback={<div className="min-h-dvh" />}>
      <StudioSite params={params} />
    </Suspense>
  );
}

// Services and photos are cached (`use cache` + tags) and refreshed whenever the
// studio changes them, so this page is served from the cache.
async function StudioSite({ params }: Pick<PageProps<"/[slug]">, "params">) {
  const tenant = await getActiveTenant((await params).slug);
  if (!tenant) notFound();

  const [services, portfolio] = await Promise.all([getPublicServices(tenant.id), getPublicPortfolio(tenant.id)]);
  const { whatsappNumber, instagramUrl } = tenant;
  const brandAssets = hasBrandAssets(tenant.slug);

  return (
    <>
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-cream focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar para o conteúdo
      </a>
      <SiteHeader tenantSlug={tenant.slug} studioName={tenant.name} />
      <BookingProvider services={services}>
        <main id="conteudo">
          <Hero whatsappNumber={whatsappNumber} brandAssets={brandAssets} />
          <ServicesSection services={services} />
          <HowItWorks />
          <PortfolioSection items={portfolio} instagramUrl={instagramUrl} />
          <section id="marcar" aria-labelledby="marcar-title" className="bg-glow py-16 pb-28 sm:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <SectionHeading id="marcar-title" eyebrow="Marcação" title="Marque o seu horário">
                Preencha os dados e a mensagem abre no WhatsApp, pronta a enviar.
              </SectionHeading>
              <div data-reveal>
                <BookingForm
                  tenantSlug={tenant.slug}
                  studioName={tenant.name}
                  whatsappNumber={whatsappNumber}
                  hours={tenant.hours}
                />
              </div>
            </div>
          </section>
        </main>
        <SelectionBar />
        <BookNowDialog targetId="marcar" headingId="marcar-title" brandAssets={brandAssets} />
      </BookingProvider>
      <SiteFooter tenant={tenant} />
      <PageMotion />
      <AnalyticsTracker tenantSlug={tenant.slug} />
    </>
  );
}
