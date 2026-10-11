"use client";

import { useEffect, useRef } from "react";
import { track } from "@/lib/analytics/client";

/**
 * Counts one page view per load, and clicks on links marked with
 * `data-track-whatsapp="<source>"` or `data-track-instagram="<source>"`.
 */
export function AnalyticsTracker() {
  const counted = useRef(false);

  useEffect(() => {
    if (!counted.current) {
      counted.current = true; // Strict Mode runs effects twice in development.
      track({ type: "pageview" });
    }

    function onClick(event: MouseEvent) {
      const link = (event.target as Element | null)?.closest<HTMLElement>(
        "[data-track-whatsapp], [data-track-instagram]",
      );
      if (!link) return;
      const { trackWhatsapp, trackInstagram } = link.dataset;
      if (trackWhatsapp) track({ type: "whatsapp_click", source: trackWhatsapp });
      else if (trackInstagram) track({ type: "instagram_click", source: trackInstagram });
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  return null;
}
