"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

/** Private areas: the studio panel and the platform backoffice. */
const PRIVATE = /^\/(admin|backoffice)(\/|$)/;

/**
 * Vercel Web Analytics for the public pages. Query strings are dropped, since
 * email links carry single-use tokens (/registo/confirmar, /recuperar/nova).
 */
function beforeSend(event: BeforeSendEvent): BeforeSendEvent | null {
  const url = new URL(event.url);
  if (PRIVATE.test(url.pathname)) return null;
  url.search = "";
  return { ...event, url: url.toString() };
}

export function VercelAnalytics() {
  return <Analytics beforeSend={beforeSend} />;
}
