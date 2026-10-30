import { getBusyIntervals } from "@/lib/data/appointments";
import { getActiveTenant } from "@/lib/data/tenants";

/**
 * GET /api/availability?tenant=<slug>&date=YYYY-MM-DD → { busy: [{ start, end }] } in minutes.
 * Read by the booking form to grey out times that are already taken.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return Response.json({ error: "Invalid date" }, { status: 400 });
  }
  const tenant = await getActiveTenant(searchParams.get("tenant") ?? "");
  if (!tenant) return Response.json({ error: "Unknown studio" }, { status: 404 });

  const busy = await getBusyIntervals(tenant.id, date);
  return Response.json({ busy }, { headers: { "Cache-Control": "no-store" } });
}
