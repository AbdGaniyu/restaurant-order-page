import type { CSSProperties } from "react";
import { ClosedBanner } from "@/components/BusinessStatus";
import { CartBar } from "@/components/CartBar";
import { CategoryNav } from "@/components/CategoryNav";
import { MenuHeader } from "@/components/MenuHeader";
import { MenuItemCard } from "@/components/MenuItemCard";
import { MenuNotes } from "@/components/MenuNotes";
import { buildMenuView, getMenu } from "@/lib/menu";

export default async function MenuPage() {
  const menu = await getMenu();
  const settings = menu.business_settings;
  const categories = buildMenuView(menu).filter((category) => category.items.length > 0);

  return (
    <div style={{ "--color-brand": settings.brand_color } as CSSProperties}>
      <MenuHeader settings={settings} />
      <ClosedBanner settings={settings} />
      <CategoryNav categories={categories.map(({ slug, name }) => ({ slug, name }))} />

      <main className="mx-auto w-full max-w-2xl px-4 pb-28">
        {categories.map((category) => (
          <section
            key={category.id}
            id={category.slug}
            aria-labelledby={`${category.slug}-heading`}
            className="scroll-mt-16 pt-8"
          >
            <h2 id={`${category.slug}-heading`} className="font-display text-xl">
              {category.name}
            </h2>
            <ul className="mt-1">
              {category.items.map((item) => (
                <MenuItemCard key={item.id} item={item} />
              ))}
            </ul>
          </section>
        ))}

        <MenuNotes settings={settings} />
      </main>

      <CartBar />
    </div>
  );
}
