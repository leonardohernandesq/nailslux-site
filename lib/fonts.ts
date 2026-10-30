import { Sora } from "next/font/google";

/** The platform's typeface. Pages that use it add `nailo` plus this variable; see globals.css. */
export const sora = Sora({ variable: "--font-sora", subsets: ["latin"], weight: ["400", "600", "700"], display: "swap" });
