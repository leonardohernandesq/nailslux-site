import type { TrackEvent, TrackPayload } from "@/lib/validation/analytics";

/** Fire-and-forget: never blocks the page, never throws. Honours Do Not Track / GPC. */
export function track(tenant: string, event: TrackEvent): void {
  try {
    const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
    if (nav.doNotTrack === "1" || nav.globalPrivacyControl) return;

    const payload: TrackPayload = { tenant, event };
    const body = JSON.stringify(payload);
    const sent = nav.sendBeacon?.("/api/analytics", new Blob([body], { type: "application/json" }));
    if (!sent) {
      void fetch("/api/analytics", { method: "POST", body, keepalive: true }).catch(() => {});
    }
  } catch {
    // Analytics must never break the site.
  }
}
