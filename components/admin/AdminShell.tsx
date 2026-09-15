import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { signOut } from "@/app/admin/actions";
import { displayUrl } from "@/lib/admin/format";
import type { Restaurant } from "@/lib/admin/session";
import { LogoTile } from "./ui";

export type AdminTab = "home" | "items" | "categories" | "orders" | "settings";

/** Desktop rail labels and order, and the phone's bottom-bar labels and order (categories is "Menu" there). */
const RAIL: { id: AdminTab; label: string }[] = [
  { id: "home", label: "Dashboard" },
  { id: "items", label: "Items" },
  { id: "categories", label: "Categories" },
  { id: "orders", label: "Orders" },
  { id: "settings", label: "Settings" },
];

const TAB_BAR: { id: AdminTab; label: string }[] = [
  { id: "home", label: "Home" },
  { id: "items", label: "Items" },
  { id: "orders", label: "Orders" },
  { id: "categories", label: "Menu" },
  { id: "settings", label: "Settings" },
];

const href = (tab: AdminTab) => (tab === "home" ? "/admin" : `/admin?tab=${tab}`);

/**
 * The admin frame. Phones: content with a 5-tab bar at the bottom, in thumb reach. Desktop (1024px
 * and up): a fixed 240px left rail, so nothing moves between sizes. The restaurant's accent colour
 * is set here for everything inside.
 */
export function AdminShell({
  restaurant,
  tab,
  publicUrl,
  children,
}: {
  restaurant: Restaurant;
  tab: AdminTab;
  publicUrl: string;
  children: ReactNode;
}) {
  return (
    <div
      style={{ "--admin-accent": restaurant.accent_hex } as CSSProperties}
      className="lg:grid lg:min-h-dvh lg:grid-cols-[240px_minmax(0,1fr)]"
    >
      <aside className="hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:gap-6 lg:border-r lg:border-admin-divider lg:bg-white lg:p-6">
        <div className="flex items-center gap-3">
          <LogoTile name={restaurant.name} logoUrl={restaurant.logo_url} size={36} />
          <span className="min-w-0 truncate text-[15px] font-extrabold">{restaurant.name}</span>
        </div>
        <nav aria-label="Admin sections" className="flex flex-col gap-1">
          {RAIL.map(({ id, label }) => (
            <Link
              key={id}
              href={href(id)}
              aria-current={id === tab ? "page" : undefined}
              className="block rounded-lg px-3 py-[11px] text-sm font-semibold text-admin-muted transition-colors hover:bg-admin-text/5 aria-[current=page]:bg-accent-100 aria-[current=page]:font-extrabold aria-[current=page]:text-accent aria-[current=page]:shadow-[inset_3px_0_0_var(--color-accent)]"
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 text-xs text-admin-muted">
          <span className="truncate">{displayUrl(publicUrl)}</span>
          <a href={publicUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-admin-text">
            View public menu <span aria-hidden>→</span>
          </a>
          <form action={signOut}>
            <button type="submit" className="min-h-11 font-semibold underline underline-offset-2">
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0 pb-[calc(4rem+env(safe-area-inset-bottom))] lg:pb-0">{children}</div>

      <nav
        aria-label="Admin sections"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-admin-divider bg-white pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        {TAB_BAR.map(({ id, label }) => (
          <Link
            key={id}
            href={href(id)}
            aria-current={id === tab ? "page" : undefined}
            className="relative grid h-16 place-items-center pb-2 text-[11px] font-extrabold tracking-[0.06em] text-admin-text uppercase aria-[current=page]:text-accent"
          >
            {id === tab && <span aria-hidden className="absolute top-2 h-[3px] w-5 rounded-sm bg-accent" />}
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
