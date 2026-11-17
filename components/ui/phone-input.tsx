"use client";

import { useEffect, useId, useRef, useState, type InputHTMLAttributes, type KeyboardEvent } from "react";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { localDigits, maskPhone, PHONE_COUNTRIES, splitPhone, withCountryCode, type PhoneCountryCode } from "@/lib/phone";
import { controlClasses } from "./field";
import { Flag } from "./flag";

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
  const [digits, setDigits] = useState(initial.digits);
  const country = PHONE_COUNTRIES.find((c) => c.code === code) ?? PHONE_COUNTRIES[0];
  const shown = maskPhone(code, digits);

  const update = (nextCode: PhoneCountryCode, nextDigits: string) => {
    const fitting = localDigits(nextCode, nextDigits);
    setCode(nextCode);
    setDigits(fitting);
    onChange?.(withCountryCode(nextCode, fitting));
  };

  const onType = (typed: string) => {
    let next = localDigits(code, typed);
    // Deleting a space, bracket or hyphen takes the digit before it, or nothing would happen.
    if (typed.length < shown.length && next === digits) next = digits.slice(0, -1);
    update(code, next);
  };

  return (
    <div className="flex gap-2">
      <CountryPicker code={code} onPick={(next) => update(next, digits)} />
      <input
        {...inputProps}
        id={id}
        type="tel"
        inputMode="numeric"
        placeholder={country.placeholder}
        value={shown}
        onChange={(event) => onType(event.target.value)}
        className={`${controlClasses} min-w-0 flex-1 ${inputProps.className ?? ""}`}
      />
      <input type="hidden" name={name} value={withCountryCode(code, digits)} />
    </div>
  );
}

/**
 * The country code, as a button that opens a list with flags. A native select can't
 * show images in its options, and flag emoji turn into "PT"/"BR" on Windows.
 */
function CountryPicker({ code, onPick }: { code: PhoneCountryCode; onPick: (code: PhoneCountryCode) => void }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapper = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selected = Math.max(0, PHONE_COUNTRIES.findIndex((c) => c.code === code));

  // A click anywhere else closes the list.
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  useEffect(() => {
    if (open) list.current?.focus();
  }, [open]);

  const show = () => {
    setActive(selected);
    setOpen(true);
  };
  const pick = (index: number) => {
    onPick(PHONE_COUNTRIES[index].code);
    setOpen(false);
    button.current?.focus();
  };

  const onButtonKey = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      show();
    }
  };
  const onListKey = (event: KeyboardEvent) => {
    const last = PHONE_COUNTRIES.length - 1;
    const moves: Record<string, () => void> = {
      ArrowDown: () => setActive((i) => Math.min(last, i + 1)),
      ArrowUp: () => setActive((i) => Math.max(0, i - 1)),
      Home: () => setActive(0),
      End: () => setActive(last),
      Enter: () => pick(active),
      " ": () => pick(active),
      Escape: () => {
        setOpen(false);
        button.current?.focus();
      },
      Tab: () => setOpen(false),
    };
    const move = moves[event.key];
    if (!move) return;
    if (event.key !== "Tab") event.preventDefault();
    move();
  };

  return (
    <div ref={wrapper} className="relative shrink-0">
      <button
        ref={button}
        type="button"
        aria-label={`Indicativo do país: ${PHONE_COUNTRIES[selected].name} (+${code})`}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onButtonKey}
        className="flex min-h-12 cursor-pointer items-center gap-2 rounded-xl border border-line-strong bg-surface px-3 text-base text-ink transition-[border-color,box-shadow] duration-150 focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15"
      >
        <Flag code={code} />
        <span className="tabular-nums">+{code}</span>
        <CaretDownIcon size={14} weight="bold" aria-hidden="true" className={`text-ink-muted transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          ref={list}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label="Indicativo do país"
          aria-activedescendant={`${listId}-${active}`}
          onKeyDown={onListKey}
          className="absolute top-full left-0 z-20 mt-1 min-w-48 rounded-xl border border-line bg-surface p-1 shadow-lift focus:outline-none"
        >
          {PHONE_COUNTRIES.map((c, index) => (
            <li
              key={c.code}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === selected}
              onPointerEnter={() => setActive(index)}
              onClick={() => pick(index)}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 ${index === active ? "bg-peach-50" : ""}`}
            >
              <Flag code={c.code} />
              <span className="flex-1">{c.name}</span>
              <span className="text-ink-muted tabular-nums">+{c.code}</span>
              {index === selected && <CheckIcon size={16} weight="bold" aria-hidden="true" className="text-accent" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
