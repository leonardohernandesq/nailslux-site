import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Quicksand } from "next/font/google";
import { VercelAnalytics } from "@/components/vercel-analytics";
import { PLATFORM } from "@/lib/site";
import "./globals.css";

const quicksand = Quicksand({
  variable: "--font-quicksand",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  // Absolute base for social-share previews; falls back to the production domain.
  metadataBase: new URL(process.env.SITE_URL ?? "https://nailslux.vercel.app"),
  title: {
    default: PLATFORM.name,
    template: `%s · ${PLATFORM.name}`,
  },
  description: PLATFORM.description,
  icons: {
    icon: [{ url: "/brand/nailo/favicon.svg", type: "image/svg+xml" }],
    apple: "/brand/nailo/app-icon-180.png",
  },
  // The card WhatsApp and others show for the platform's links: the favicon on the
  // landing's navy gradient. It must be a PNG or JPEG: they ignore SVG.
  // Studio pages replace the whole `openGraph` with their own.
  openGraph: {
    type: "website",
    locale: "pt_PT",
    siteName: PLATFORM.name,
    title: `${PLATFORM.name} · ${PLATFORM.description}`,
    description: "Site com marcações online, agenda e ficha de clientes para o seu studio de unhas.",
    images: [{ url: "/brand/nailo/share-card.png", width: 1200, height: 630, alt: PLATFORM.name }],
  },
};

export const viewport: Viewport = {
  themeColor: "#fff8f3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" data-scroll-behavior="smooth" className={`${quicksand.variable} ${cormorant.variable} antialiased`}>
      <body className="min-h-dvh">
        {children}
        <VercelAnalytics />
      </body>
    </html>
  );
}
