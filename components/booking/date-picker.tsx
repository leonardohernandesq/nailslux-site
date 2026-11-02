"use client";

import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { DayPicker } from "react-day-picker";
import { pt } from "react-day-picker/locale";
import { parseISODate, toISODate } from "@/lib/format";
import { isOpenOn } from "@/lib/schedule";
import type { OpeningHours } from "@/lib/site";

const CLASS_NAMES = {
  root: "relative mt-2 rounded-2xl border border-line p-3 sm:p-4",
  months: "w-full",
  month: "w-full",
  nav: "absolute inset-x-3 top-3 flex items-center justify-between sm:inset-x-4 sm:top-4",
  button_previous:
    "inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-peach-50 aria-disabled:cursor-default aria-disabled:opacity-30",
  button_next:
    "inline-flex size-11 cursor-pointer items-center justify-center rounded-full text-ink hover:bg-peach-50 aria-disabled:cursor-default aria-disabled:opacity-30",
  month_caption: "flex h-11 items-center justify-center",
  caption_label: "font-display text-lg font-semibold capitalize",
  month_grid: "mt-2 w-full table-fixed border-collapse",
  weekday: "pb-2 text-xs font-semibold text-ink-muted capitalize",
  day: "p-0.5 text-center",
  day_button:
    "mx-auto flex aspect-square w-full max-w-11 cursor-pointer items-center justify-center rounded-full text-sm font-semibold " +
    "transition-colors duration-150 hover:bg-peach-100 focus-visible:ring-4 focus-visible:ring-accent/20 focus-visible:outline-none " +
    "disabled:cursor-default disabled:font-normal disabled:text-ink-muted/50 disabled:line-through disabled:hover:bg-transparent",
  selected: "[&>button]:bg-accent [&>button]:text-on-accent [&>button]:hover:bg-accent-hover",
  today: "[&>button]:ring-1 [&>button]:ring-line-strong",
};

/** The month calendar for booking: days the studio is closed can't be picked. */
export function DatePicker({
  value,
  bounds,
  hours,
  onChange,
}: {
  value: string;
  bounds: { min: string; max: string };
  hours: OpeningHours;
  onChange: (isoDate: string) => void;
}) {
  const min = parseISODate(bounds.min);
  const max = parseISODate(bounds.max);

  return (
    <DayPicker
      mode="single"
      required
      locale={pt}
      weekStartsOn={1}
      selected={value ? parseISODate(value) : undefined}
      onSelect={(day) => onChange(toISODate(day))}
      startMonth={min}
      endMonth={max}
      disabled={[{ before: min }, { after: max }, (day) => !isOpenOn(toISODate(day), hours)]}
      classNames={CLASS_NAMES}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? <CaretLeftIcon size={18} weight="bold" /> : <CaretRightIcon size={18} weight="bold" />,
      }}
    />
  );
}
