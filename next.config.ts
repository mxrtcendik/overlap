import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

const isDev = process.env.NODE_ENV === "development";

if (!isDev) {
  for (const name of ["SITE_URL", "NEXT_PUBLIC_TURNSTILE_SITE_KEY"]) {
    if (!process.env[name]) console.warn(`${name} is not set. See .env.example before deploying.`);
  }
}
const analytics = Boolean(process.env.NEXT_PUBLIC_CF_WEB_ANALYTICS_TOKEN) && !isDev;

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com${analytics ? " https://static.cloudflareinsights.com" : ""}${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self'",
  `connect-src 'self'${analytics ? " https://cloudflareinsights.com" : ""}${isDev ? " ws: wss:" : ""}`,
  "frame-src https://challenges.cloudflare.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  ...(isDev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]),
];

const nextConfig: NextConfig = {
  headers: async () => [
    { source: "/:path*", headers: securityHeaders },
    {
      source: "/p/:path*",
      headers: [
        { key: "Cache-Control", value: "private, no-store" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
    },
    {
      source: "/o/:path*",
      headers: [
        { key: "Cache-Control", value: "private, no-store" },
        { key: "Referrer-Policy", value: "no-referrer" },
        { key: "X-Robots-Tag", value: "noindex, nofollow" },
      ],
    },
  ],
};

export default nextConfig;

initOpenNextCloudflareForDev({ configPath: "wrangler.dev.jsonc" });
