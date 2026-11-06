import { Instrument_Serif, Sora } from "next/font/google";

/** The platform's typeface. Pages that use it add `nailo` plus this variable; see globals.css. */
export const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });

/** The landing page's accent serif, for a few highlighted words (`font-luxe`). */
export const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});
