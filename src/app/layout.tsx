import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description = "Find a time that works for everyone. Send one link, see the overlap in your own timezone. No accounts.";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.SITE_URL ?? (process.env.NODE_ENV === "production" ? "https://overlap.cendik.dev" : "http://localhost:3000"),
  ),
  title: { default: "Overlap", template: "%s · Overlap" },
  description,
  openGraph: { type: "website", siteName: "Overlap", title: "Overlap", description },
  twitter: { card: "summary_large_image", title: "Overlap", description },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f3ef" },
    { media: "(prefers-color-scheme: dark)", color: "#161513" },
  ],
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-scroll-behavior="smooth" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
