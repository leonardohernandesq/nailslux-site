import { z } from "zod";
import { normalizePhone } from "../phone";
import type { OpeningHours } from "../site";
import { dateBounds, isOpenOn, slotsFor } from "../schedule";

/**
 * Booking request validation. Built per render because the valid dates and times
 * depend on "now" and on which services exist.
 */
export function createBookingSchema(options: {
  serviceIds: readonly string[];
  hours: OpeningHours;
  now: Date;
}) {
  const { serviceIds, hours, now } = options;
  const { min, max } = dateBounds(hours, now);

  return z
    .object({
      name: z
        .string()
        .trim()
        .min(2, { error: "Indique o seu nome." })
        .max(60, { error: "Máximo de 60 caracteres." }),
      phone: z
        .string()
        .trim()
        .min(1, { error: "Indique o seu número de WhatsApp." })
        .transform((value, ctx) => {
          const phone = normalizePhone(value);
          if (!phone) {
            ctx.addIssue({ code: "custom", message: "Indique um número válido, ex.: 912 345 678." });
            return z.NEVER;
          }
          return phone;
        }),
      serviceIds: z
        .array(z.string())
        .min(1, { error: "Escolha pelo menos um serviço." })
        .refine((ids) => ids.every((id) => serviceIds.includes(id)), {
          error: "Um dos serviços escolhidos já não está disponível.",
        }),
      date: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Escolha uma data." })
        .refine((date) => date >= min, { error: "Escolha uma data a partir de hoje." })
        .refine((date) => date <= max, {
          error: `Só é possível marcar até ${hours.maxDaysAhead} dias de antecedência.`,
        })
        .refine((date) => isOpenOn(date, hours), {
          error: "O studio está fechado nesse dia. Escolha outra data.",
        }),
      time: z.string().regex(/^\d{2}:\d{2}$/, { error: "Escolha uma hora." }),
      notes: z
        .string()
        .trim()
        .max(300, { error: "Máximo de 300 caracteres." })
        .optional()
        .transform((value) => value || undefined),
    })
    .superRefine((data, ctx) => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(data.date)) return;
      if (!slotsFor(data.date, hours, now).includes(data.time)) {
        ctx.addIssue({
          code: "custom",
          path: ["time"],
          message: "Essa hora não está disponível. Escolha outra.",
        });
      }
    });
}

export type BookingInput = z.input<ReturnType<typeof createBookingSchema>>;
export type BookingRequest = z.output<ReturnType<typeof createBookingSchema>>;
