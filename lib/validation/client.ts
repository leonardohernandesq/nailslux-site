import { z } from "zod";

const mold = z
  .string()
  .trim()
  .max(40, { error: "Máximo de 40 caracteres." })
  .optional()
  .transform((value) => value || undefined);

/** The admin's mold numbers for a client; both are optional. */
export const moldsSchema = z.object({ handMold: mold, footMold: mold });
