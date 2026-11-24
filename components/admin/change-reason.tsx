import { Textarea } from "@/components/ui/field";
import { CHANGE_REASON_MAX } from "@/lib/constants";

/**
 * "O que aconteceu?" in the cancel and reschedule dialogs. Private: it goes to
 * the client's history, never into the WhatsApp message.
 */
export function ChangeReason({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="mt-5 flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        O que aconteceu? <span className="font-medium text-ink-muted">(opcional)</span>
      </label>
      <Textarea
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={CHANGE_REASON_MAX}
        rows={2}
        disabled={disabled}
        placeholder="Ex.: a cliente ficou doente, pediu para passar para a semana seguinte…"
        aria-describedby={`${id}-hint`}
        className="min-h-20"
      />
      <p id={`${id}-hint`} className="text-sm text-ink-muted">
        Fica só no histórico da cliente. Não vai na mensagem de WhatsApp.
      </p>
    </div>
  );
}
