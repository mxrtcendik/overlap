import { defineConfig, devices } from "@playwright/test";

const ci = Boolean(process.env.CI);
const worker = process.env.E2E_TARGET === "worker";
const port = Number(process.env.E2E_PORT ?? (worker ? 8787 : 3000));
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "e2e",
  testMatch: worker ? "worker/**/*.spec.ts" : "*.spec.ts",
  testIgnore: worker ? [] : ["**/worker/**"],
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  workers: ci ? 2 : undefined,
  reporter: ci ? [["github"], ["html", { open: "never" }]] : "list",
  timeout: 60_000,
  use: {
    baseURL,
    locale: "en-US",
    timezoneId: "Europe/Istanbul",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command: worker ? "bun run preview" : `bun run dev --port ${port}`,
    url: baseURL,
    reuseExistingServer: !ci,
    timeout: worker ? 600_000 : 180_000,
  },
});
