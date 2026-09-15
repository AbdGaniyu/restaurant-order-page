"use client";

import { useOptimistic, useState, useTransition } from "react";
import { setOrderStatus, type OrderStatus } from "@/app/admin/actions";
import { formatNaira } from "@/lib/format";
import { formatSentAt } from "@/lib/hours";
import type { OrderSnapshotLine } from "@/lib/order-log";
import { ErrorText, Section } from "./controls";

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

const STATUS_LABELS: Record<OrderStatus, string> = {
  sent: "New",
  confirmed: "Confirmed",
  fulfilled: "Done",
  cancelled: "Cancelled",
};

const naira = (kobo: number) => formatNaira(kobo / 100);

export function OrdersTab({ orders }: { orders: AdminOrder[] }) {
  return (
    <Section title="Orders">
      <p className="text-sm text-muted">
        Every tap on “Order on WhatsApp” is logged here, even if the customer didn’t press Send. Match it to the
        WhatsApp message by its reference, then mark it confirmed.
      </p>
      {orders.length === 0 ? (
        <p className="mt-8 text-center text-muted">No orders yet.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </ul>
      )}
    </Section>
  );
}

function OrderCard({ order }: { order: AdminOrder }) {
  const [status, setStatus] = useOptimistic(order.status);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const change = (next: OrderStatus) =>
    startTransition(async () => {
      setStatus(next);
      setError(null);
      const result = await setOrderStatus(order.id, next);
      if ("error" in result) setError(result.error);
    });

  const phoneDigits = order.customer_phone?.replace(/\D/g, "");

  return (
    <li className={`rounded-2xl border p-4 ${status === "sent" ? "border-ink" : "border-line"}`}>
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-bold tabular-nums">{order.reference}</p>
        <p className="text-sm text-muted">{formatSentAt(new Date(order.created_at))}</p>
      </div>
      <p className="mt-1">
        <strong>{order.customer_name}</strong> · {order.order_type === "delivery" ? "Delivery" : "Pickup"}
      </p>
      {order.order_type === "delivery" && (order.address || order.landmark) && (
        <p className="text-sm text-muted">
          {order.address}
          {order.landmark && ` (${order.landmark})`}
        </p>
      )}
      {order.customer_phone && (
        <p className="text-sm">
          <a
            href={`https://wa.me/${phoneDigits}`}
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline underline-offset-2"
          >
            {order.customer_phone}
          </a>
        </p>
      )}

      <ul className="mt-3 space-y-1 text-sm">
        {order.items.map((line, index) => (
          <li key={index}>
            <div className="flex justify-between gap-3">
              <span>
                {line.quantity}× {line.name}
                {line.not_on_menu && <span className="ml-1 font-bold text-alert">(not on menu)</span>}
                {line.sold_out && <span className="ml-1 font-bold text-alert">(sold out)</span>}
              </span>
              <span className="tabular-nums">{naira(line.line_total_kobo)}</span>
            </div>
            {line.options.length > 0 && (
              <p className="pl-4 text-muted">{line.options.map((option) => option.name).join(", ")}</p>
            )}
            {line.note && <p className="pl-4 text-muted">Note: {line.note}</p>}
          </li>
        ))}
      </ul>
      <p className="mt-2 flex justify-between border-t border-line pt-2 font-bold">
        <span>Total</span>
        <span className="tabular-nums">{naira(order.total_kobo)}</span>
      </p>

      <fieldset className="mt-3">
        <legend className="sr-only">Status of {order.reference}</legend>
        <div className="grid grid-cols-4 gap-1">
          {(Object.keys(STATUS_LABELS) as OrderStatus[]).map((option) => (
            <label
              key={option}
              className="grid h-11 cursor-pointer place-items-center rounded-xl border border-line text-sm font-bold has-checked:border-ink has-checked:bg-ink has-checked:text-page has-focus-visible:outline-2 has-focus-visible:outline-ink"
            >
              <input
                type="radio"
                name={`status-${order.id}`}
                value={option}
                checked={status === option}
                onChange={() => change(option)}
                className="sr-only"
              />
              {STATUS_LABELS[option]}
            </label>
          ))}
        </div>
      </fieldset>
      <ErrorText error={error} className="mt-2" />
    </li>
  );
}
