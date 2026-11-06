import { z } from "zod";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Longest single stretch of time off, so a typo can't close the studio for years. */
export const MAX_TIME_OFF_DAYS = 366;

/** Most entries a studio keeps at once; past ones are cleared as new ones come in. */
export const MAX_TIME_OFF_ENTRIES = 50;

function daysBetween(start: string, end: string): number {
  return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86_400_000);
}

/** Built per request: dates before `today` (Lisbon) are refused. */
export function createTimeOffSchema(today: string) {
  return z
    .object({
      start: z
        .string()
        .regex(DATE_PATTERN, { error: "Escolha o primeiro dia." })
        .refine((date) => date >= today, { error: "Escolha uma data a partir de hoje." }),
      end: z
        .string()
        .optional()
        .transform((value) => value || undefined)
        .refine((value) => value === undefined || DATE_PATTERN.test(value), { error: "Escolha o último dia." }),
      // "day" for whole days, "hours" for a stretch of each day.
      span: z.enum(["day", "hours"], { error: "Escolha se é o dia inteiro ou só algumas horas." }),
      from: z.string().optional(),
      to: z.string().optional(),
      note: z
        .string()
        .trim()
        .max(80, { error: "Máximo de 80 caracteres." })
        .optional()
        .transform((value) => value || undefined),
    })
    .superRefine((data, ctx) => {
      const end = data.end ?? data.start;
      if (end < data.start) {
        ctx.addIssue({ code: "custom", path: ["end"], message: "O último dia tem de ser depois do primeiro." });
      } else if (daysBetween(data.start, end) >= MAX_TIME_OFF_DAYS) {
        ctx.addIssue({ code: "custom", path: ["end"], message: "Escolha um período de até um ano." });
      }
      if (data.span === "hours") {
        if (!TIME_PATTERN.test(data.from ?? "")) {
          ctx.addIssue({ code: "custom", path: ["from"], message: "Indique a hora de início." });
        } else if (!TIME_PATTERN.test(data.to ?? "")) {
          ctx.addIssue({ code: "custom", path: ["to"], message: "Indique a hora de fim." });
        } else if (data.from! >= data.to!) {
          ctx.addIssue({ code: "custom", path: ["to"], message: "A hora de fim tem de ser depois da de início." });
        }
      }
    })
    .transform(({ start, end, span, from, to, note }) => ({
      start,
      end: end ?? start,
      ...(span === "hours" && { from, to }),
      ...(note && { note }),
    }));
}
