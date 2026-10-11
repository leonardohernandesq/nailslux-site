"use client";

import { useFormStatus } from "react-dom";
import { CircleNotchIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

type Props = React.ComponentProps<typeof Button> & { pendingLabel?: string };

/** Submit button that disables itself and shows a spinner while its form submits. */
export function SubmitButton({ children, pendingLabel, disabled, ...props }: Props) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending || disabled} aria-busy={pending || undefined} {...props}>
      {pending && <CircleNotchIcon size={18} className="animate-spin" aria-hidden="true" />}
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

/** Small square icon button for row actions (move, hide, delete…). */
export function IconSubmitButton({
  label,
  children,
  tone = "default",
}: {
  label: string;
  children: React.ReactNode;
  tone?: "default" | "danger";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={label}
      title={label}
      className={`flex size-11 items-center justify-center rounded-full transition-colors disabled:opacity-50 ${
        tone === "danger" ? "text-danger hover:bg-danger-soft" : "text-ink-muted hover:bg-peach-50 hover:text-ink"
      }`}
    >
      {pending ? <CircleNotchIcon size={20} className="animate-spin" aria-hidden="true" /> : children}
    </button>
  );
}
