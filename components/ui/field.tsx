import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

export const controlClasses =
  "block w-full min-h-12 rounded-xl border border-line-strong bg-surface px-4 py-3 text-base text-ink " +
  "placeholder:text-ink-muted/70 transition-[border-color,box-shadow] duration-150 " +
  "focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 " +
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/15 disabled:opacity-50";

type FieldProps = {
  id: string;
  label: string;
  required?: boolean;
  hint?: string;
  errors?: string[];
  children: ReactNode;
  className?: string;
};

/** Label + control + hint + error, wired together with ids for screen readers. */
export function Field({ id, label, required, hint, errors, children, className = "" }: FieldProps) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
        {required ? (
          <span className="text-accent" aria-hidden="true">
            {" "}
            *
          </span>
        ) : (
          <span className="font-medium text-ink-muted"> (opcional)</span>
        )}
      </label>
      {children}
      {hint && !errors?.length && (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} errors={errors} />
    </div>
  );
}

export function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) return null;
  return (
    <p id={id} className="text-sm font-semibold text-danger">
      {errors[0]}
    </p>
  );
}

/** aria props for a control inside <Field>. */
export function describedBy(id: string, errors?: string[], hint?: string) {
  const invalid = Boolean(errors?.length);
  return {
    "aria-invalid": invalid || undefined,
    "aria-describedby": invalid ? `${id}-error` : hint ? `${id}-hint` : undefined,
  } as const;
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${controlClasses} ${props.className ?? ""}`} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={`${controlClasses} min-h-24 resize-y ${props.className ?? ""}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={`${controlClasses} appearance-auto ${props.className ?? ""}`} />;
}
