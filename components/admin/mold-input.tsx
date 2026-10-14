"use client";

import { useRef, useState, type ClipboardEvent, type KeyboardEvent } from "react";
import { MOLD_DIGITS, MOLD_MAX_SIZE } from "@/lib/constants";

/** True when no more digits can follow: "0", or a digit that can't start a two-digit size. */
function isComplete(value: string): boolean {
  if (value.length >= 2) return true;
  const n = Number(value);
  return value.length === 1 && (n === 0 || n * 10 > MOLD_MAX_SIZE);
}

/** "3 10 5 7 9" or "3-10-5-7-9" split on separators; "310579" is read greedily. */
function parseSizes(text: string): string[] {
  const groups = text.match(/\d+/g) ?? [];
  if (groups.length > 1) return groups.map((g) => g.slice(0, 2));
  const sizes: string[] = [];
  let current = "";
  for (const digit of groups[0] ?? "") {
    if (current && Number(current + digit) <= MOLD_MAX_SIZE && !isComplete(current)) {
      sizes.push(current + digit);
      current = "";
    } else {
      if (current) sizes.push(current);
      current = digit;
      if (isComplete(current)) {
        sizes.push(current);
        current = "";
      }
    }
  }
  if (current) sizes.push(current);
  return sizes;
}

const fromValue = (value?: string) =>
  Array.from({ length: MOLD_DIGITS }, (_, i) => value?.split("-")[i]?.replace(/\D/g, "").slice(0, 2) ?? "");

/**
 * Five small boxes, one size (0–20) per finger, that move along as you type like
 * a verification code. Submits as one hidden field: "3-6-5-7-9".
 */
export function MoldInput({
  name,
  label,
  fingers,
  defaultValue,
  errors,
}: {
  name: string;
  label: string;
  /** Name of each box, in order; also shown as its placeholder. */
  fingers: readonly string[];
  defaultValue?: string;
  errors?: string[];
}) {
  const [sizes, setSizes] = useState(() => fromValue(defaultValue));
  const boxes = useRef<(HTMLInputElement | null)[]>([]);
  const focus = (i: number) => boxes.current[Math.max(0, Math.min(MOLD_DIGITS - 1, i))]?.focus();
  const labelId = `${name}-label`;
  const errorId = `${name}-error`;
  const invalid = Boolean(errors?.length);

  /** Writes sizes from box `start` on, then moves focus past the last one written. */
  function fill(start: number, values: string[]) {
    const next = [...sizes];
    values.slice(0, MOLD_DIGITS - start).forEach((v, k) => (next[start + k] = v));
    setSizes(next);
    const last = start + Math.min(values.length, MOLD_DIGITS - start) - 1;
    focus(isComplete(next[last] ?? "") ? last + 1 : last);
  }

  function onChange(i: number, raw: string) {
    const digits = raw.replace(/\D/g, "");
    if (digits === "") {
      setSizes((s) => s.map((v, k) => (k === i ? "" : v)));
      return;
    }
    // "15" doesn't fit in one box: keep the "1" and carry the "5" to the next.
    fill(i, Number(digits) > MOLD_MAX_SIZE || digits.length > 2 ? parseSizes(digits) : [digits]);
  }

  function onKeyDown(i: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && sizes[i] === "" && i > 0) {
      event.preventDefault();
      setSizes((s) => s.map((v, k) => (k === i - 1 ? "" : v)));
      focus(i - 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      focus(i - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      focus(i + 1);
    }
  }

  function onPaste(i: number, event: ClipboardEvent<HTMLInputElement>) {
    const values = parseSizes(event.clipboardData.getData("text"));
    if (values.length === 0) return;
    event.preventDefault();
    fill(i, values);
  }

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span id={labelId} className="text-sm font-semibold text-ink">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={labelId}
        aria-describedby={invalid ? errorId : undefined}
        className="grid grid-cols-5 gap-1.5"
      >
        {sizes.map((size, i) => (
          <input
            key={i}
            ref={(el) => {
              boxes.current[i] = el;
            }}
            value={size}
            onChange={(e) => onChange(i, e.target.value)}
            onKeyDown={(e) => onKeyDown(i, e)}
            onPaste={(e) => onPaste(i, e)}
            onFocus={(e) => e.target.select()}
            aria-label={fingers[i]}
            placeholder={fingers[i]}
            aria-invalid={invalid || undefined}
            inputMode="numeric"
            autoComplete="off"
            maxLength={3}
            className="h-10 w-full min-w-0 rounded-lg border border-line-strong bg-surface px-0.5 text-center text-base font-medium text-ink tabular-nums transition-[border-color,box-shadow] duration-150 placeholder:text-[10px] placeholder:font-normal placeholder:text-ink-muted/70 focus:border-accent focus:ring-2 focus:ring-accent/15 focus:outline-none aria-invalid:border-danger"
          />
        ))}
      </div>
      <input type="hidden" name={name} value={sizes.join("-")} />
      {invalid && (
        <p id={errorId} className="text-sm font-semibold text-danger">
          {errors![0]}
        </p>
      )}
    </div>
  );
}
