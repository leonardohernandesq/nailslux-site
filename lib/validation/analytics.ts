import { z } from "zod";

const source = z.string().regex(/^[a-z-]{1,40}$/);

/** What the browser may send to /api/analytics. Everything else is derived on the server. */
export const trackEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("pageview") }),
  z.object({ type: z.literal("whatsapp_click"), source }),
  z.object({ type: z.literal("instagram_click"), source }),
  z.object({
    type: z.literal("booking"),
    serviceIds: z.array(z.string().max(40)).min(1).max(20),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  }),
]);

/** `tenant` is the studio's public slug: which site the event happened on. */
export const trackPayloadSchema = z.object({ tenant: z.string().max(40), event: trackEventSchema });

export type TrackEvent = z.infer<typeof trackEventSchema>;
export type TrackPayload = z.infer<typeof trackPayloadSchema>;
