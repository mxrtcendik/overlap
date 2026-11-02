export const MAX_PLACE = 200;

export type PlaceResult = { ok: true; place: string | null } | { ok: false; error: string };

/** A room, an address or a video-call link. Empty clears it. */
export function parsePlace(input: unknown): PlaceResult {
  if (input === null || input === undefined) return { ok: true, place: null };
  if (typeof input !== "string") return { ok: false, error: "Enter a place or a link." };
  const place = input.replace(/\s+/g, " ").trim();
  if (place === "") return { ok: true, place: null };
  if (place.length > MAX_PLACE) return { ok: false, error: `Places can be up to ${MAX_PLACE} characters.` };
  return { ok: true, place };
}

/** The place as a safe http(s) link, or null when it's plain text. */
export function placeLink(place: string): URL | null {
  if (!/^https?:\/\//i.test(place)) return null;
  try {
    const url = new URL(place);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}
