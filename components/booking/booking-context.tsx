"use client";

import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";
import type { BookingService } from "@/lib/whatsapp";

type BookingContextValue = {
  services: readonly BookingService[];
  selectedIds: string[];
  toggle: (id: string) => void;
  isSelected: (id: string) => boolean;
  /** Service that was just picked from a card; drives the "book now?" dialog. */
  promptedId: string | null;
  askToBook: (id: string) => void;
  dismissPrompt: () => void;
};

const BookingContext = createContext<BookingContextValue | null>(null);

/** Shares the chosen services between the service cards and the booking form. */
export function BookingProvider({
  services,
  children,
}: {
  services: readonly BookingService[];
  children: ReactNode;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [promptedId, setPromptedId] = useState<string | null>(null);

  const toggle = useCallback((id: string) => {
    setSelectedIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));
  }, []);

  const dismissPrompt = useCallback(() => setPromptedId(null), []);

  const value = useMemo(
    () => ({
      services,
      selectedIds,
      toggle,
      isSelected: (id: string) => selectedIds.includes(id),
      promptedId,
      askToBook: setPromptedId,
      dismissPrompt,
    }),
    [services, selectedIds, toggle, promptedId, dismissPrompt],
  );

  return <BookingContext value={value}>{children}</BookingContext>;
}

export function useBooking() {
  const ctx = use(BookingContext);
  if (!ctx) throw new Error("useBooking must be used inside <BookingProvider>");
  return ctx;
}
