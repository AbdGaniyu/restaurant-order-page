"use client";

import { Fragment, useOptimistic, useState, useTransition } from "react";
import { setOrderStatus, type OrderStatus } from "@/app/admin/actions";
import { startOfBusinessDay, startOfBusinessWeek } from "@/lib/admin/dashboard";
import { orderTime } from "@/lib/admin/format";
import { formatNaira } from "@/lib/format";
import type { OrderSnapshotLine } from "@/lib/order-log";
import { cx, AppBar, btnSecondary, ErrorText, PageHeading, SegmentedFilter } from "./ui";

export interface AdminOrder {
  id: string;
  reference: string;
  created_at: string;
  items: (OrderSnapshotLine & { sold_out?: boolean; not_on_menu?: boolean })[];
  total_kobo: number;
  customer_name: string;
  customer_phone: string | null;
  order_type: "pickup" | "delivery";
  address: string | null;
  landmark: string | null;
  note: string | null;
  status: OrderStatus;
}

type Filter = "today" | "week";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
];

const STATUSES: { id: OrderStatus; label: string }[] = [
  { id: "sent", label: "New" },
  { id: "confirmed", label: "Confirmed" },
  { id: "fulfilled", label: "Done" },
  { id: "cancelled", label: "Cancelled" },
];

const naira = (kobo: number) => formatNaira(kobo / 100);
const summary = (order: AdminOrder) => order.items.map((line) => `${line.quantity}× ${line.name}`).join(", ");

const NewTag = () => (
  <span className="rounded-full bg-accent-100 px-2 py-0.5 text-[11px] font-semibold text-accent-700">New</span>
);

/**
 * Orders, newest first, filtered to today or this week (Lagos time). Tapping one expands its
 * lines, notes and delivery details, a status control and "Open in WhatsApp". A table on desktop.
 */
export function OrdersTab({ orders, nowIso }: { orders: AdminOrder[]; nowIso: string }) {
  const now = new Date(nowIso);
  const [filter, setFilter] = useState<Filter>("today");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const since = (filter === "today" ? startOfBusinessDay(now) : startOfBusinessWeek(now)).getTime();
  const shown = orders.filter((order) => new Date(order.created_at).getTime() >= since);
  const total = shown.filter((order) => order.status !== "cancelled").reduce((sum, order) => sum + order.total_kobo, 0);
  const count = `${shown.length} ${shown.length === 1 ? "order" : "orders"}`;

  const toggle = (id: string) =>
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const filterControl = <SegmentedFilter label="Show orders from" options={FILTERS} value={filter} onChange={setFilter} />;

  return (
    <div className="lg:px-10 lg:py-8">
      <AppBar title="Orders" action={<div className="pr-3">{filterControl}</div>} />
      <PageHeading title="Orders" subtitle={`${count} · ${naira(total)}`} action={filterControl} />
      <div className="flex justify-between border-b border-admin-divider px-5 py-3 text-[13px] text-admin-muted lg:hidden">
        <span>{count}</span>
        <span className="tabular-nums">{naira(total)}</span>
      </div>

      {shown.length === 0 ? (
        <p className="px-5 py-12 text-center text-admin-muted">
          {filter === "today" ? "No orders yet today." : "No orders this week."}
        </p>
      ) : (
        <>
          <ul className="lg:hidden">
            {shown.map((order) => {
              const open = expanded.has(order.id);
              return (
                <li key={order.id} className="border-b border-admin-divider">
                  <button
                    type="button"
                    aria-expanded={open}
                    onClick={() => toggle(order.id)}
                    className="grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 px-5 py-3 text-left"
                  >
                    <span className="flex items-center gap-2 text-[15px] font-extrabold">
                      <span className="truncate">{order.customer_name}</span>
                      {order.status === "sent" && <NewTag />}
                    </span>
                    <span className="text-[15px] font-extrabold tabular-nums">{naira(order.total_kobo)}</span>
                    <span className="truncate text-[13px] text-admin-muted">{summary(order)}</span>
                    <span className="text-[13px] text-admin-muted">{orderTime(order.created_at, now)}</span>
                  </button>
                  {open && <OrderDetails order={order} />}
                </li>
              );
            })}
          </ul>

          <table className="mt-2 hidden w-full border-collapse text-sm lg:table">
            <thead>
              <tr className="text-left text-[11px] tracking-[0.08em] text-admin-muted uppercase">
                <th className="w-[120px] border-b border-admin-divider p-2 font-semibold">Time</th>
                <th className="w-[96px] border-b border-admin-divider p-2 font-semibold">Order</th>
                <th className="border-b border-admin-divider p-2 font-semibold">Customer</th>
                <th className="border-b border-admin-divider p-2 font-semibold">Items</th>
                <th className="border-b border-admin-divider p-2 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((order) => {
                const open = expanded.has(order.id);
                return (
                  <Fragment key={order.id}>
                    <tr onClick={() => toggle(order.id)} className="cursor-pointer hover:bg-admin-text/[0.04]">
                      <td className="border-b border-admin-divider p-2 text-admin-muted">{orderTime(order.created_at, now)}</td>
                      <td className="border-b border-admin-divider p-2 text-admin-muted">{order.reference}</td>
                      <td className="border-b border-admin-divider p-2">
                        <button
                          type="button"
                          aria-expanded={open}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggle(order.id);
                          }}
                          className="text-left font-semibold"
                        >
                          {order.customer_name}
                        </button>
                        {order.status === "sent" && (
                          <span className="ml-2">
                            <NewTag />
                          </span>
                        )}
                      </td>
                      <td className="border-b border-admin-divider p-2">{summary(order)}</td>
                      <td className="border-b border-admin-divider p-2 text-right font-extrabold tabular-nums">
                        {naira(order.total_kobo)}
                      </td>
                    </tr>
                    {open && (
                      <tr>
                        <td colSpan={5} className="border-b border-admin-divider bg-accent-100 py-0 pr-2 pl-[128px]">
                          <OrderDetails order={order} />
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </>
      )}

      <p className="px-5 pt-4 pb-6 text-xs text-admin-muted lg:px-0">
        Every tap on “Order on WhatsApp” is logged here, even if the customer didn’t press Send. Match it to the
        WhatsApp message by its reference.
      </p>
    </div>
  );
}

function OrderDetails({ order }: { order: AdminOrder }) {
  const [status, setStatus] = useOptimistic(order.status);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const notes = [
    ...order.items.filter((line) => line.note).map((line) => `${line.note} (${line.name})`),
    ...(order.note ? [order.note] : []),
  ];
  const phoneDigits = order.customer_phone?.replace(/\D/g, "");

  const change = (next: OrderStatus) =>
    startTransition(async () => {
      setStatus(next);
      setError(null);
      const result = await setOrderStatus(order.id, next);
      if ("error" in result) setError(result.error);
    });

  return (
    <div className="flex flex-col gap-2 px-5 pb-4 lg:max-w-[560px] lg:px-0 lg:pt-3">
      <ul>
        {order.items.map((line, index) => (
          <li
            key={index}
            className="grid grid-cols-[28px_minmax(0,1fr)_auto] border-t border-admin-neutral-300 py-1 text-sm lg:border-0"
          >
            <span className="text-admin-muted">{line.quantity}×</span>
            <span>
              {line.name}
              {line.not_on_menu && <span className="ml-1 font-semibold text-alert">(no longer on the menu)</span>}
              {line.sold_out && <span className="ml-1 font-semibold text-alert">(sold out)</span>}
              {line.options.length > 0 && (
                <span className="block text-[13px] text-admin-muted">{line.options.map((option) => option.name).join(", ")}</span>
              )}
            </span>
            <span className="tabular-nums">{naira(line.line_total_kobo)}</span>
          </li>
        ))}
      </ul>
      {notes.length > 0 && (
        <div className="rounded-lg bg-accent-100 px-3 py-2 text-[13px] lg:bg-transparent lg:px-0 lg:py-0 lg:text-admin-muted">
          Note: {notes.join(" · ")}
        </div>
      )}
      <p className="text-[13px] text-admin-muted">
        {order.order_type === "delivery"
          ? `Delivery${order.address ? ` · ${order.address}` : ""}${order.landmark ? ` (${order.landmark})` : ""}`
          : "Pickup"}
      </p>
      <SegmentedFilter label={`Status of order ${order.reference}`} options={STATUSES} value={status} onChange={change} />
      <div className="flex items-center gap-3 pt-1">
        {phoneDigits ? (
          <a
            href={`https://wa.me/${phoneDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className={cx(`${btnSecondary} min-h-11 flex-1 lg:min-h-10 lg:flex-none`)}
          >
            Open in WhatsApp
          </a>
        ) : (
          <span className="flex-1 text-[13px] text-admin-muted lg:flex-none">No phone given: reply in the WhatsApp chat.</span>
        )}
        <span className="px-1 text-[15px] font-extrabold text-accent">{order.reference}</span>
      </div>
      <ErrorText error={error} />
    </div>
  );
}
