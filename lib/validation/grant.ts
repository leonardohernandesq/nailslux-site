import { z } from "zod";

/** Most free time given at once: a year, either way. */
export const GRANT_LIMITS = { days: 366, months: 12 } as const;

export const grantTimeSchema = z
  .object({
    amount: z.coerce
      .number({ error: "Indique um número." })
      .int({ error: "Use um número inteiro." })
      .min(1, { error: "Pelo menos 1." }),
    unit: z.enum(["days", "months"], { error: "Escolha dias ou meses." }),
    // The plan a new subscription starts on; ignored when one is extended.
    plan: z.string().optional(),
  })
  .superRefine(({ amount, unit }, ctx) => {
    if (amount > GRANT_LIMITS[unit]) {
      ctx.addIssue({ code: "custom", path: ["amount"], message: `No máximo ${GRANT_LIMITS[unit]} ${unit === "days" ? "dias" : "meses"} de cada vez.` });
    }
  });
