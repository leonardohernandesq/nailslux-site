"use client";

import { useState, type InputHTMLAttributes } from "react";
import { CaretDownIcon } from "@phosphor-icons/react";
import { PHONE_COUNTRIES, splitPhone, withCountryCode, type PhoneCountryCode } from "@/lib/phone";
import { controlClasses } from "./field";

type PhoneInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "name" | "value" | "defaultValue" | "onChange" | "type"> & {
  id: string;
  /** The form field that gets the full number, with the country code. */
  name: string;
  /** A stored number ("351912345678") or what was sent before. */
  defaultValue?: string;
  /** The country picked when `defaultValue` doesn't say. */
  defaultCountry?: PhoneCountryCode;
  /** Called with the full number, as the form will send it. */
  onChange?: (value: string) => void;
};

/** A country code picker and the number, on one line. `id` is the number's, for the label. */
export function PhoneInput({ id, name, defaultValue = "", defaultCountry, onChange, ...inputProps }: PhoneInputProps) {
  const [initial] = useState(() => splitPhone(defaultValue, defaultCountry));
  const [code, setCode] = useState<PhoneCountryCode>(initial.code);
  const [local, setLocal] = useState(initial.local);
  const country = PHONE_COUNTRIES.find((c) => c.code === code) ?? PHONE_COUNTRIES[0];

  const update = (nextCode: PhoneCountryCode, nextLocal: string) => {
    setCode(nextCode);
    setLocal(nextLocal);
    onChange?.(withCountryCode(nextCode, nextLocal));
  };

  return (
    <div className="flex gap-2">
      {/* Flag emoji don't render on Windows and options can't hold images, so the flag
          is drawn here and the real select sits on top of it, invisible, taking the clicks. */}
      <div className="relative flex min-h-12 shrink-0 items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 text-base text-ink transition-[border-color,box-shadow] duration-150 focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/15">
        <Flag code={code} />
        <span className="tabular-nums" aria-hidden="true">
          +{code}
        </span>
        <CaretDownIcon size={14} weight="bold" aria-hidden="true" className="text-ink-muted" />
        <select
          aria-label="Indicativo do país"
          value={code}
          onChange={(event) => update(event.target.value as PhoneCountryCode, local)}
          className="absolute inset-0 cursor-pointer opacity-0"
        >
          {PHONE_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {c.name} (+{c.code})
            </option>
          ))}
        </select>
      </div>
      <input
        {...inputProps}
        id={id}
        type="tel"
        inputMode="tel"
        placeholder={country.placeholder}
        value={local}
        onChange={(event) => update(code, event.target.value)}
        className={`${controlClasses} min-w-0 flex-1 ${inputProps.className ?? ""}`}
      />
      <input type="hidden" name={name} value={withCountryCode(code, local)} />
    </div>
  );
}

/** Simplified flags, drawn the same on every system. */
function Flag({ code }: { code: PhoneCountryCode }) {
  const frame = "h-4 w-6 shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10";
  if (code === "55") {
    return (
      <svg viewBox="0 0 30 20" aria-hidden="true" className={frame}>
        <rect width="30" height="20" fill="#009b3a" />
        <path d="M15 2.5 27 10 15 17.5 3 10z" fill="#fedf00" />
        <circle cx="15" cy="10" r="4.6" fill="#002776" />
        <path d="M10.6 9.1c3-.9 6.3-.5 8.8 1" stroke="#fff" strokeWidth="0.9" fill="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 30 20" aria-hidden="true" className={frame}>
      <rect width="30" height="20" fill="#da291c" />
      <rect width="12" height="20" fill="#046a38" />
      <circle cx="12" cy="10" r="4" fill="#ffe900" />
      <path d="M10 7.5h4v3.3a2 2 0 0 1-4 0z" fill="#da291c" stroke="#fff" strokeWidth="0.6" />
    </svg>
  );
}
