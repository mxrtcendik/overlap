export class UserFacingError extends Error {}

export async function request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, init);
  } catch {
    throw new UserFacingError("Couldn’t reach overlap. Check your connection and try again.");
  }
  const data = (await response.json().catch(() => null)) as (T & { error?: string }) | null;
  if (!response.ok) throw new UserFacingError(data?.error ?? "Something went wrong. Try again.");
  return data as T;
}

export function messageOf(caught: unknown): string {
  return caught instanceof UserFacingError ? caught.message : "Something went wrong. Try again.";
}

export const json = (body: unknown): RequestInit => ({
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});
