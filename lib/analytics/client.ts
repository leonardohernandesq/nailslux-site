import type { TrackEvent } from "@/lib/validation/analytics";

/** Fire-and-forget: never blocks the page, never throws. Honours Do Not Track / GPC. */
export function track(event: TrackEvent): void {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;

    const body = JSON.stringify(event);
    const sent = nav.sendBeacon?.("/api/analytics", new Blob([body], { type: "application/json" }));
    if (!sent) {
      void fetch("/api/analytics", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    // Analytics must never break the site.
  }
}
