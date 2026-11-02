import { readImage, renderShareImage } from "@/lib/db/images";

// Images never change under an id (see ../route.ts), so this card is cached forever too.
export async function GET(_request: Request, ctx: RouteContext<"/api/images/[id]/share">) {
  const { id } = await ctx.params;
  const image = await readImage(id);
  if (!image) return new Response("Not found", { status: 404 });

  const card = await renderShareImage(image.buffer);
  return new Response(new Uint8Array(card), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(card.length),
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
