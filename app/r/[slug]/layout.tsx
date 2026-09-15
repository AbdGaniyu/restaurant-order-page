import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { getMenu, getPublishedSlugs } from "@/lib/menu";

type Params = { params: Promise<{ slug: string }> };

/** Every published restaurant is prerendered at build time; ones published later render on first visit. */
export async function generateStaticParams() {
  return (await getPublishedSlugs()).map((slug) => ({ slug }));
}

async function settingsFor(params: Params["params"]) {
  const menu = await getMenu((await params).slug);
  if (!menu) notFound();
  return menu.business_settings;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const settings = await settingsFor(params);
  const description = `See the ${settings.name} menu, build your order and send it on WhatsApp.`;
  return {
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

export async function generateViewport({ params }: Params): Promise<Viewport> {
  return { themeColor: (await settingsFor(params)).brand_color };
}

export default function RestaurantLayout({ children }: LayoutProps<"/r/[slug]">) {
  return children;
}
