import { z } from "zod";
import { MOLD_DIGITS, MOLD_MAX_SIZE } from "../constants";

/**
 * One size per finger, sent as "3-6-5-7-9" (empty boxes leave gaps: "3--5--").
 * All empty clears the mold; otherwise all five must be 0–MOLD_MAX_SIZE.
 */
const mold = z
  .string()
  .optional()
  .transform((value, ctx) => {
    const parts = (value ?? "").split("-").map((part) => part.trim());
    if (parts.every((part) => part === "")) return undefined;

    if (parts.length !== MOLD_DIGITS || parts.some((part) => part === "")) {
      ctx.addIssue({ code: "custom", message: `Preencha os ${MOLD_DIGITS} números ou deixe todos vazios.` });
      return z.NEVER;
    }
    if (parts.some((part) => !/^\d{1,2}$/.test(part) || Number(part) > MOLD_MAX_SIZE)) {
      ctx.addIssue({ code: "custom", message: `Cada número vai de 0 a ${MOLD_MAX_SIZE}.` });
      return z.NEVER;
    }
    return parts.map(Number).join("-");
  });

/** The admin's mold sizes for a client; each one is optional. */
export const moldsSchema = z.object({ handMold: mold, footMold: mold });
