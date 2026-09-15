import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { CartView } from "@/components/cart/CartView";
import { buildMenuView, getMenu } from "@/lib/menu";

export async function generateMetadata(): Promise<Metadata> {
  const { business_settings: settings } = await getMenu();
  return { title: `Your order · ${settings.name}`, robots: { index: false } };
}

export default async function CartPage() {
  const menu = await getMenu();
  const settings = menu.business_settings;
  // The current menu, so saved cart lines can be re-priced and checked for sold-out items.
  const items = buildMenuView(menu).flatMap((category) => category.items);

  return (
    <div style={{ "--color-brand": settings.brand_color } as CSSProperties}>
      <CartView settings={settings} items={items} />
    </div>
  );
}
