import { getBusyIntervals } from "@/lib/data/appointments";

/**
 * GET /api/availability?date=YYYY-MM-DD → { busy: [{ start, end }] } in minutes.
 * Read by the booking form to grey out times that are already taken.
 */
export async function GET(request: Request) {
  const date = new URL(request.url).searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }
  const busy = await getBusyIntervals(date);
  return Response.json({ busy }, { headers: { "Cache-Control": "no-store" } });
}
