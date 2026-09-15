import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import { Atkinson_Hyperlegible, Bungee } from "next/font/google";
import "./globals.css";

const display = Bungee({
  weight: "400",
  variable: "--font-bungee",
  subsets: ["latin"],
});

// The original cut rather than "Next": Next.js has fallback metrics for it, so the swap doesn't shift the layout.
const body = Atkinson_Hyperlegible({
  weight: ["400", "700"],
  variable: "--font-atkinson",
  subsets: ["latin"],
});

/** Absolute base for share-preview URLs. On Vercel, the production domain; locally, the dev server. */
function siteUrl(): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

// Each restaurant's layout (app/r/[slug]/layout.tsx) sets its own title, description and theme colour.
export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: "Menu",
  description: "See the menu, build your order and send it on WhatsApp.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-NG" className={`${display.variable} ${body.variable} antialiased`}>
      <body className="min-h-full">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
