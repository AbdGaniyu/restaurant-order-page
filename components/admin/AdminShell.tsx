import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { signOut } from "@/app/admin/actions";
import type { Restaurant } from "@/lib/admin/session";

export const ADMIN_TABS = [
  { id: "items", label: "Items" },
  { id: "categories", label: "Categories" },
  { id: "orders", label: "Orders" },
  { id: "settings", label: "Settings" },
] as const;

export type AdminTab = (typeof ADMIN_TABS)[number]["id"];

/** Header with the restaurant and a link to its live menu; tabs along the bottom, where a thumb reaches. */
export function AdminShell({
  restaurant,
  tab,
  children,
}: {
  restaurant: Restaurant;
  tab: AdminTab;
  children: ReactNode;
}) {
  return (
    <div style={{ "--color-brand": restaurant.accent_hex } as CSSProperties}>
      <header className="sticky top-0 z-20 border-b border-line bg-page/95 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-2">
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-lg leading-tight">{restaurant.name}</p>
            <p className="text-sm">
              <a
                href={`/r/${restaurant.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-bold underline underline-offset-2"
              >
                View menu<span aria-hidden> ↗</span>
              </a>
              {!restaurant.is_published && <span className="ml-2 text-muted">Hidden from customers</span>}
            </p>
          </div>
          <form action={signOut}>
            <button type="submit" className="h-11 px-2 text-sm font-bold text-muted underline underline-offset-2">
              Sign out
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl px-4 pb-40">{children}</main>

      <nav
        aria-label="Admin sections"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="mx-auto grid max-w-2xl grid-cols-4">
          {ADMIN_TABS.map(({ id, label }) => (
            <li key={id}>
              <Link
                href={`/admin?tab=${id}`}
                aria-current={id === tab ? "page" : undefined}
                className="grid h-16 place-items-center text-sm font-bold text-muted aria-[current=page]:text-ink"
              >
                <span
                  className={`border-t-4 px-2 pt-1 ${id === tab ? "border-brand" : "border-transparent"}`}
                >
                  {label}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
