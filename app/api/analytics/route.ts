import { auth } from "@/auth";
import { isBot, recordEvent } from "@/lib/analytics/server";
import { trackEventSchema } from "@/lib/validation/analytics";

const noContent = () => new Response(null, { status: 204 });

/** Receives anonymous events from the public site (sent with navigator.sendBeacon). */
export async function POST(request: Request) {
  const userAgent = request.headers.get("user-agent") ?? "";
  if (isBot(userAgent)) return noContent();

  let body: unknown;
  try {
    body = JSON.parse(await request.text());
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }
  const parsed = trackEventSchema.safeParse(body);
  if (!parsed.success) return new Response("Invalid event", { status: 400 });

  // The studio owner browsing her own site shouldn't count as a visitor.
  if ((await auth())?.user) return noContent();

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  await recordEvent(parsed.data, { ip, userAgent, at: new Date() });
  return noContent();
}
