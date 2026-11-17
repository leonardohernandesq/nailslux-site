import { PHONE_COUNTRIES, type PhoneCountryCode } from "@/lib/phone";

/**
 * Simplified flags, drawn the same on every system (flag emoji turn into "PT"/"BR"
 * on Windows). Decorative unless `label` is set, which reads the country's name.
 */
export function Flag({ code, label = false, className = "h-4 w-6" }: { code: PhoneCountryCode; label?: boolean; className?: string }) {
  const name = PHONE_COUNTRIES.find((c) => c.code === code)?.name;
  const a11y = label ? { role: "img", "aria-label": name } : { "aria-hidden": true };
  const frame = `${className} shrink-0 overflow-hidden rounded-[3px] ring-1 ring-black/10`;
  if (code === "55") {
    return (
      <svg viewBox="0 0 30 20" {...a11y} className={frame}>
        <rect width="30" height="20" fill="#009b3a" />
        <path d="M15 2.5 27 10 15 17.5 3 10z" fill="#fedf00" />
        <circle cx="15" cy="10" r="4.6" fill="#002776" />
        <path d="M10.6 9.1c3-.9 6.3-.5 8.8 1" stroke="#fff" strokeWidth="0.9" fill="none" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 30 20" {...a11y} className={frame}>
      <rect width="30" height="20" fill="#da291c" />
      <rect width="12" height="20" fill="#046a38" />
      <circle cx="12" cy="10" r="4" fill="#ffe900" />
      <path d="M10 7.5h4v3.3a2 2 0 0 1-4 0z" fill="#da291c" stroke="#fff" strokeWidth="0.6" />
    </svg>
  );
}
