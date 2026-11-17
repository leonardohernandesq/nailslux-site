"use client";

import { useState, type InputHTMLAttributes } from "react";
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
      <select
        aria-label="Indicativo do país"
        value={code}
        onChange={(event) => update(event.target.value as PhoneCountryCode, local)}
        // Without the base w-full: Tailwind doesn't let a later class win over an earlier one.
        className={`${controlClasses.replace("w-full", "w-auto")} shrink-0 appearance-auto px-3`}
      >
        {PHONE_COUNTRIES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.flag} +{c.code}
          </option>
        ))}
      </select>
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
