import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";
import { CartView } from "@/components/cart/CartView";
import { buildMenuView, getMenu } from "@/lib/menu";

/** ISR, like the menu: the prices the cart re-checks against are at most a minute old. */
export const revalidate = 60;

export async function generateMetadata({ params }: PageProps<"/r/[slug]/cart">): Promise<Metadata> {
  const menu = await getMenu((await params).slug);
  if (!menu) notFound();
  return { title: `Your order · ${menu.business_settings.name}`, robots: { index: false } };
}

export default async function CartPage({ params }: PageProps<"/r/[slug]/cart">) {
  const menu = await getMenu((await params).slug);
  if (!menu) notFound();
  const settings = menu.business_settings;
  // The current menu, so saved cart lines can be re-priced and checked for sold-out items.
  const items = buildMenuView(menu).flatMap((category) => category.items);

  return (
    <div style={{ "--color-brand": settings.brand_color } as CSSProperties}>
      <CartView settings={settings} items={items} />
    </div>
  );
}
