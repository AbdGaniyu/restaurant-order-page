"use client";

import Link from "next/link";
import { setOpenNow } from "@/app/admin/actions";
import type { DashboardStats } from "@/lib/admin/dashboard";
import { compactNaira, displayUrl, greeting, longDate, shortDate } from "@/lib/admin/format";
import { formatNaira } from "@/lib/format";
import { IconBan, IconCoins, IconReceipt, IconTrendingUp } from "./icons";
import { downloadQr, useCopy } from "./PublicLink";
import { cx, AppBar, ErrorText, sectionLabel, StatTile, Switch, useOptimisticToggle } from "./ui";

export interface LatestOrder {
  id: string;
  when: string;
  customer: string;
  summary: string;
  totalKobo: number;
}

export interface OpenState {
  /** What customers see right now: the owner's override if set, otherwise the opening hours. */
  isOpen: boolean;
  overridden: boolean;
  /** "22:00" when open by the hours; null otherwise. */
  closesAt: string | null;
  /** "tomorrow at 10:00 AM" when closed; null otherwise. */
  opensAt: string | null;
}

const naira = (kobo: number) => formatNaira(kobo / 100);

/**
 * Home: today's numbers, the open/closed switch and one-tap links to everything else (every admin
 * action is within two taps of here). The phone shows the essentials; desktop adds average order,
 * sold-out count and the latest orders.
 */
export function Dashboard({
  restaurantName,
  slug,
  publicUrl,
  nowIso,
  stats,
  soldOut,
  latest,
  open,
}: {
  restaurantName: string;
  slug: string;
  publicUrl: string;
  nowIso: string;
  stats: DashboardStats;
  soldOut: number;
  latest: LatestOrder[];
  open: OpenState;
}) {
  const now = new Date(nowIso);
  const { shown: isOpen, toggle, error } = useOptimisticToggle(open.isOpen, setOpenNow);
  const { copied, copy } = useCopy(publicUrl);

  const openLabel = isOpen
    ? open.overridden && !open.closesAt
      ? "Open — manual override"
      : "Open now"
    : open.overridden
      ? "Closed — manual override"
      : "Closed";
  const openSub = isOpen
    ? open.closesAt && open.isOpen
      ? `Closes ${open.closesAt} · customers can order`
      : "Customers can order"
    : open.opensAt
      ? `Opens ${open.opensAt} · orders come in as pre-orders`
      : "Orders come in as pre-orders";

  const openSwitch = (
    <Switch checked={isOpen} onChange={toggle} label="Open now" size="lg" />
  );
  const tile =
    "flex min-h-[72px] flex-col items-start justify-between rounded-xl border border-admin-divider bg-white p-3 text-left text-sm font-extrabold transition-colors hover:bg-admin-text/[0.03]";
  const quickRow =
    "flex min-h-12 items-center justify-between border-b border-admin-divider text-sm font-extrabold last:border-b-0";

  return (
    <>
      {/* Phone */}
      <div className="lg:hidden">
        <AppBar
          title={restaurantName}
          action={<span className="shrink-0 pr-3 text-xs text-admin-muted">{shortDate(now)}</span>}
        />
        <div className="grid grid-cols-2 gap-3 px-5 pt-4 pb-1">
          <StatTile label="Orders today" value={stats.ordersToday} icon={<IconReceipt />} />
          <StatTile label="Total today" value={compactNaira(stats.totalTodayKobo / 100)} icon={<IconCoins />} />
        </div>
        <div className="flex items-center justify-between gap-4 border-b border-admin-divider px-5 py-4">
          <div>
            <p className="text-[15px] font-extrabold">{openLabel}</p>
            <p className="text-[13px] text-admin-muted">{openSub}</p>
            <ErrorText error={error} />
          </div>
          {openSwitch}
        </div>

        <p className={cx(`px-5 pt-5 pb-2 ${sectionLabel}`)}>Quick actions</p>
        <div className="mx-5 grid grid-cols-2 gap-3">
          <Link href="/admin?tab=items&add=1" className={tile}>
            <span aria-hidden className="text-accent">
              +
            </span>
            Add item
          </Link>
          <Link href="/admin?tab=orders" className={tile}>
            <span className="text-xs font-normal text-admin-muted">{stats.newOrders} new</span>
            Orders
          </Link>
          <Link href="/admin?tab=items" className={tile}>
            <span className="text-xs font-normal text-admin-muted">{soldOut} sold out</span>
            Availability
          </Link>
          <button type="button" onClick={copy} className={tile}>
            <span className="max-w-full truncate text-xs font-normal text-admin-muted">{displayUrl(publicUrl)}</span>
            {copied ? "Copied" : "Copy link"}
          </button>
        </div>
        <a
          href={publicUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-5 mt-4 flex min-h-11 items-center justify-between border-b border-admin-divider text-sm font-extrabold"
        >
          View public menu
          <span aria-hidden className="text-accent">
            →
          </span>
        </a>
      </div>

      {/* Desktop */}
      <div className="hidden flex-col gap-8 px-10 py-8 lg:flex">
        <div className="flex items-end justify-between gap-6 border-b border-admin-divider pb-4">
          <div>
            <p className="text-xs text-admin-muted">{longDate(now)}</p>
            <h1 className="mt-1 text-[32px] leading-[1.12] font-extrabold">
              {greeting(now)}, {restaurantName}
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-[15px] font-extrabold">{openLabel}</p>
              <p className="text-xs text-admin-muted">{openSub}</p>
              <ErrorText error={error} />
            </div>
            {openSwitch}
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <StatTile label="Orders today" value={stats.ordersToday} icon={<IconReceipt />} />
          <StatTile label="Total today" value={naira(stats.totalTodayKobo)} icon={<IconCoins />} />
          <StatTile label="Avg. order" value={naira(stats.averageKobo)} icon={<IconTrendingUp />} />
          <StatTile label="Sold out" value={soldOut} icon={<IconBan />} accent={soldOut > 0} />
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_360px] gap-10">
          <section aria-labelledby="latest-heading">
            <div className="flex items-baseline justify-between border-b border-admin-divider pb-2">
              <h2 id="latest-heading" className={cx(`font-normal ${sectionLabel}`)}>
                Latest orders
              </h2>
              <Link href="/admin?tab=orders" className="text-[13px] text-accent underline underline-offset-4">
                All orders
              </Link>
            </div>
            {latest.length === 0 ? (
              <p className="py-6 text-sm text-admin-muted">No orders yet this week.</p>
            ) : (
              <ul>
                {latest.map((order) => (
                  <li
                    key={order.id}
                    className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-baseline gap-4 border-b border-admin-divider py-3 text-sm"
                  >
                    <span className="text-admin-muted">{order.when}</span>
                    <span className="truncate">
                      <strong className="font-extrabold">{order.customer}</strong>{" "}
                      <span className="text-admin-muted">· {order.summary}</span>
                    </span>
                    <span className="font-extrabold tabular-nums">{naira(order.totalKobo)}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-labelledby="quick-heading">
            <h2 id="quick-heading" className={cx(`mb-2 border-b border-admin-divider pb-2 font-normal ${sectionLabel}`)}>
              Quick actions
            </h2>
            <div className="flex flex-col rounded-xl border border-admin-divider bg-white px-4 py-1">
              <Link href="/admin?tab=items&add=1" className={quickRow}>
                Add item
                <span aria-hidden className="text-accent">
                  +
                </span>
              </Link>
              <Link href="/admin?tab=items" className={quickRow}>
                Mark something sold out
                <span aria-hidden className="text-accent">
                  →
                </span>
              </Link>
              <button type="button" onClick={copy} className={quickRow}>
                {copied ? "Copied" : "Copy public link"}
                <span aria-hidden className="text-accent">
                  ⧉
                </span>
              </button>
              <button type="button" onClick={() => downloadQr(publicUrl, slug, "png")} className={quickRow}>
                Download QR code
                <span aria-hidden className="text-accent">
                  ↓
                </span>
              </button>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
