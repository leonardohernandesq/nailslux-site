import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Quicksand } from "next/font/google";
import { SITE } from "@/lib/site";
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
    default: `${SITE.name} · ${SITE.tagline}`,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  openGraph: {
    type: "website",
    locale: "pt_PT",
    siteName: SITE.name,
    title: `${SITE.name} · ${SITE.tagline}`,
    description: SITE.description,
    images: [{ url: "/brand/logo-full.png", width: 900, height: 587, alt: SITE.name }],
  },
};

export const viewport: Viewport = {
  themeColor: "#fff8f3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-PT" data-scroll-behavior="smooth" className={`${quicksand.variable} ${cormorant.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
