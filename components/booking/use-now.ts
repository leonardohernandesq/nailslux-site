"use client";

import { useSyncExternalStore } from "react";

// The current time, refreshed every 30s. It's null during prerender/hydration so
// the server HTML never depends on the clock; the real value arrives right after.
const MINUTE = 60_000;

function subscribe(onChange: () => void) {
  const timer = setInterval(onChange, 30_000);
  return () => clearInterval(timer);
}

const getMinute = () => Math.floor(Date.now() / MINUTE);
const getServerMinute = () => null;

export function useNow(): Date | null {
  const minute = useSyncExternalStore(subscribe, getMinute, getServerMinute);
  return minute === null ? null : new Date(minute * MINUTE);
}
