export const CREATE_ACTION = "create-poll";
export const VOTE_ACTION = "first-answer";
export const EMAIL_ACTION = "email-links";

const MAX_TOKEN = 2048;

export function readToken(input: unknown): string | null {
  return typeof input === "string" && input.length > 0 && input.length <= MAX_TOKEN ? input : null;
}

export type SiteverifyResult = {
  success?: boolean;
  action?: string;
  hostname?: string;
  "error-codes"?: string[];
  metadata?: { result_with_testing_key?: boolean };
};

export function judge(
  result: SiteverifyResult,
  expected: { action: string; hostnames: string[]; allowTestKeys: boolean },
): boolean {
  if (result.success !== true) return false;
  if (result.metadata?.result_with_testing_key) return expected.allowTestKeys;
  return result.action === expected.action && expected.hostnames.includes(result.hostname ?? "");
}

export function parseHostnames(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
}
