import { refresh, updateTag } from "next/cache";

/** Expires a public cache tag and re-renders the admin page that made the change. */
export function invalidate(tag: string): void {
  updateTag(tag);
  refresh();
}
