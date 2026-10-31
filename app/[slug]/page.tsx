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
import { SuspendedSite } from "@/components/platform/suspended-site";
import { getActiveTenant, getActiveTenantSlugs, isTenantSuspended } from "@/lib/data/tenants";
import { brandStyle } from "@/lib/brand-colors";
import { studioBrand } from "@/lib/studio-brand";

// Cache Components needs at least one param to validate the route at build time;
// this is the fallback for a database with no studios yet. Studios that join later
// render on their first visit, with no new deploy.
const SAMPLE_SLUG = "nailslux";

export async function generateStaticParams() {
  const slugs = await getActiveTenantSlugs();
  return (slugs.length > 0 ? slugs : [SAMPLE_SLUG]).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: PageProps<"/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const tenant = await getActiveTenant(slug);
  if (!tenant) {
    return (await isTenantSuspended(slug)) ? { title: { absolute: "Site suspenso" }, robots: { index: false } } : {};
  }

  const title = `${tenant.name} · ${tenant.tagline}`;
  const { icon, appleIcon, shareImage } = studioBrand(tenant);
  return {
    title: { absolute: title },
    description: tenant.description,
    // Studio sites use their own icon; without one, the platform's from the root layout.
    ...(icon && appleIcon && { icons: { icon, apple: appleIcon } }),
    openGraph: {
      type: "website",
      locale: "pt_PT",
      siteName: tenant.name,
      title,
      description: tenant.description,
      ...(shareImage && { images: [{ url: shareImage.src, width: shareImage.width, height: shareImage.height, alt: tenant.name }] }),
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
  const { slug } = await params;
  const tenant = await getActiveTenant(slug);
  if (!tenant) {
    if (await isTenantSuspended(slug)) return <SuspendedSite />;
    notFound();
  }

  const [services, portfolio] = await Promise.all([getPublicServices(tenant.id), getPublicPortfolio(tenant.id)]);
  const { whatsappNumber, instagramUrl } = tenant;
  const brand = studioBrand(tenant);

  return (
    <div style={brandStyle(tenant.brand.primaryColor, tenant.brand.secondaryColor)} className="bg-cream">
      <a
        href="#conteudo"
        className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-cream focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Saltar para o conteúdo
      </a>
      <SiteHeader tenantSlug={tenant.slug} studioName={tenant.name} logo={brand.logo} />
      <BookingProvider services={services}>
        <main id="conteudo">
          <Hero whatsappNumber={whatsappNumber} studioName={tenant.name} banner={brand.banner} mascot={brand.mascot} />
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
        <BookNowDialog targetId="marcar" headingId="marcar-title" mascot={brand.mascot} />
      </BookingProvider>
      <SiteFooter tenant={tenant} logo={brand.logo} />
      <PageMotion />
      <AnalyticsTracker tenantSlug={tenant.slug} />
    </div>
  );
}
