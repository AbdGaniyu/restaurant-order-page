import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Bungee } from "next/font/google";
import { getMenu } from "@/lib/menu";
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

export async function generateMetadata(): Promise<Metadata> {
  const { business_settings: settings } = await getMenu();
  const description = `See the ${settings.name} menu, build your order and send it on WhatsApp.`;
  return {
    metadataBase: new URL(siteUrl()),
    title: `${settings.name} · Menu`,
    description,
    openGraph: {
      type: "website",
      siteName: settings.name,
      locale: "en_NG",
      title: settings.name,
      description,
    },
    twitter: { card: "summary_large_image" },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const { business_settings: settings } = await getMenu();
  return { themeColor: settings.brand_color };
}

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
