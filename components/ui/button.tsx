import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap " +
  // `scale` (not `transform`): Tailwind v4's scale utilities set the individual property.
  "transition-[background-color,color,box-shadow,scale] duration-200 ease-(--ease-out-soft) " +
  "active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 cursor-pointer [&_svg]:shrink-0";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-on-accent shadow-soft hover:bg-accent-hover hover:shadow-lift",
  secondary: "bg-surface text-accent ring-1 ring-line-strong hover:bg-peach-50 hover:ring-accent",
  ghost: "text-ink hover:bg-peach-50",
  danger: "bg-surface text-danger ring-1 ring-danger/30 hover:bg-danger-soft",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-4 text-sm",
  md: "min-h-12 px-6 text-base",
  lg: "min-h-14 px-8 text-lg",
};

/** Class names for anything that should look like a button (e.g. a Link). */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className = "",
}: { variant?: Variant; size?: Size; className?: string } = {}) {
  return `${base} ${variants[variant]} ${sizes[size]} ${className}`;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={buttonClasses({ variant, size, className })} {...props} />;
}
