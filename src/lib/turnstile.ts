import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { clientIp } from "./rate";
import { judge, parseHostnames, readToken, type SiteverifyResult } from "./turnstile-check";

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export async function verifyTurnstile(request: Request, input: unknown, action: string): Promise<boolean> {
  const token = readToken(input);
  if (!token) return false;
  const { env } = await getCloudflareContext({ async: true });
  const vars: Partial<Pick<CloudflareEnv, "TURNSTILE_SECRET" | "TURNSTILE_HOSTNAMES">> = env;
  if (!vars.TURNSTILE_SECRET) {
    console.error(JSON.stringify({ event: "turnstile_unconfigured" }));
    return false;
  }

  const form = new FormData();
  form.append("secret", vars.TURNSTILE_SECRET);
  form.append("response", token);
  const ip = clientIp(request);
  if (ip !== "local") form.append("remoteip", ip);

  try {
    const response = await fetch(SITEVERIFY, { method: "POST", body: form, signal: AbortSignal.timeout(5000) });
    if (!response.ok) throw new Error(`siteverify ${response.status}`);
    const result = (await response.json()) as SiteverifyResult;
    const passed = judge(result, {
      action,
      hostnames: parseHostnames(vars.TURNSTILE_HOSTNAMES),
      allowTestKeys: process.env.NODE_ENV === "development",
    });
    if (!passed) {
      console.warn(JSON.stringify({ event: "turnstile_rejected", codes: result["error-codes"] ?? [] }));
    }
    return passed;
  } catch (error) {
    console.error(JSON.stringify({ event: "turnstile_error", message: error instanceof Error ? error.message : "error" }));
    return false;
  }
}
