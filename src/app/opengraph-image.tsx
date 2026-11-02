import { DEMO_PEOPLE, demoCounts } from "@/lib/demo-data";
import { ogImage, OG_SIZE } from "@/server/og-image";

export const alt = "Overlap: find the time everyone can make. Pick a few days, send one link, no accounts.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  const people = DEMO_PEOPLE.length;
  return ogImage({
    title: "Find the time everyone can make.",
    line: "Pick a few days, send one link. Everyone answers in their own timezone. No accounts.",
    people,
    columns: demoCounts().map((column) => column.map((count) => ({ count, outlined: count === people }))),
  });
}
