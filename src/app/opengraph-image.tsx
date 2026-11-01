import { DEMO_PEOPLE, demoCounts } from "@/lib/demo-data";
import { ogImage, OG_SIZE } from "@/lib/og-image";

export const alt = "Overlap: pick a few days, send one link, and see when everyone is free.";
export const size = OG_SIZE;
export const contentType = "image/png";

export default function Image() {
  const people = DEMO_PEOPLE.length;
  return ogImage({
    title: "Pick a few days. Send one link.",
    line: "See when everyone is free, each in their own timezone. No accounts.",
    people,
    columns: demoCounts().map((column) => column.map((count) => ({ count, outlined: count === people }))),
  });
}
