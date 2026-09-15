"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AbulaStripe } from "@/components/AbulaStripe";
import { ClosedBanner } from "@/components/BusinessStatus";
import { OrderSent } from "@/components/cart/OrderSent";
import { QuantityStepper } from "@/components/QuantityStepper";
import { analytics } from "@/lib/analytics";
import { businessShortName, takeawayPackPrices } from "@/lib/business";
import { cartItemCount, cartSubtotal, lineTotal, repriceCart, type CheckedLine } from "@/lib/cart";
import { removeFromCart, updateQuantity, useCart, useCartLoaded } from "@/lib/cart-store";
import {
  CHECKOUT_FIELDS,
  checkoutErrors,
  logOrder,
  prepareOrder,
  type CheckoutField,
  type CheckoutForm,
  type PreparedOrder,
} from "@/lib/checkout";
import { formatNaira, formatNairaRange } from "@/lib/format";
import { formatDailyHours, getBusinessStatus } from "@/lib/hours";
import type { MenuItemView } from "@/lib/menu";
import type { BusinessSettings, OrderType } from "@/lib/types";
import { MINUTE_MS, useCurrentMinute } from "@/lib/use-current-minute";
import { openWhatsApp, watchForStayingHere } from "@/lib/whatsapp";

const EMPTY_FORM: CheckoutForm = { name: "", orderType: null, address: "", landmark: "", phone: "" };
const ORDER_TYPE_LABELS: Record<OrderType, string> = { delivery: "Delivery", pickup: "Pickup" };

const inputClass = (error?: string) =>
  `mt-2 h-12 w-full rounded-xl border px-3 text-base ${error ? "border-alert" : "border-line"}`;

export function CartView({ settings, items }: { settings: BusinessSettings; items: MenuItemView[] }) {
  const saved = useCart();
  const loaded = useCartLoaded();
  const minute = useCurrentMinute();
  const [form, setForm] = useState<CheckoutForm>(EMPTY_FORM);
  const [showErrors, setShowErrors] = useState(false);
  const [sent, setSent] = useState<PreparedOrder | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const stopWatching = useRef<(() => void) | undefined>(undefined);

  useEffect(() => () => stopWatching.current?.(), []);

  const menuHref = `/r/${settings.slug}`;

  const { lines, removed } = repriceCart(saved, items);
  const soldOut = lines.some((line) => line.sold_out);
  const subtotal = cartSubtotal(lines);

  const status = minute === null ? null : getBusinessStatus(settings, new Date(minute * MINUTE_MS));
  const deliveryAvailable = status?.deliveryAvailable ?? false;
  const orderTypes = (["delivery", "pickup"] as const).filter((type) =>
    type === "delivery" ? settings.accepts_delivery : settings.accepts_pickup,
  );
  // Until the customer picks, default to delivery while it's running, otherwise pickup.
  const orderType: OrderType | null =
    form.orderType ??
    (settings.accepts_delivery && deliveryAvailable ? "delivery" : settings.accepts_pickup ? "pickup" : null);
  const deliveryHours = formatDailyHours(settings.delivery_hours);

  const errors = checkoutErrors(
    { ...form, orderType },
    { deliveryAvailable, pickupAvailable: settings.accepts_pickup },
  );
  const errorFor = (field: CheckoutField) => (showErrors ? errors[field] : undefined);
  const update = <K extends CheckoutField>(field: K, value: CheckoutForm[K]) =>
    setForm((current) => ({ ...current, [field]: value }));

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstError = CHECKOUT_FIELDS.find((field) => errors[field]);
    if (firstError || soldOut || orderType === null) {
      setShowErrors(true);
      if (firstError) {
        event.currentTarget.querySelector<HTMLElement>(`[name="${firstError}"]:not(:disabled)`)?.focus();
      }
      return;
    }
    const customer = { ...form, orderType };
    const order = prepareOrder({ settings, lines, customer, host: window.location.host });
    logOrder(settings.slug, order.reference, lines, customer);
    openWhatsApp(order.url);
    analytics.orderSent({ order_type: orderType, item_count: cartItemCount(lines), subtotal });
    setSent(order);
    setShowFallback(false);
    stopWatching.current?.();
    stopWatching.current = watchForStayingHere(2000, () => setShowFallback(true));
    window.scrollTo({ top: 0 });
  };

  if (sent) {
    return (
      <>
        <CartHeader menuHref={menuHref} />
        <OrderSent
          order={sent}
          settings={settings}
          showFallback={showFallback}
          onShowFallback={() => setShowFallback(true)}
        />
      </>
    );
  }

  return (
    <>
      <CartHeader menuHref={menuHref} />
      <ClosedBanner settings={settings} />

      <main className="mx-auto w-full max-w-2xl px-4 pb-36">
        {!loaded ? (
          <p className="py-16 text-center text-muted">Loading your order…</p>
        ) : (
          <>
            {removed.length > 0 && (
              <div role="status" className="mt-6 rounded-2xl border border-alert p-4 text-sm">
                <p>
                  <strong>{[...new Set(removed.map((line) => line.name))].join(", ")}</strong>{" "}
                  {removed.length === 1 ? "is" : "are"} no longer on the menu and won’t be in your order.
                </p>
                <button
                  type="button"
                  onClick={() => removed.forEach((line) => removeFromCart(line.line_id))}
                  className="mt-2 font-bold underline underline-offset-2"
                >
                  OK, remove
                </button>
              </div>
            )}

            {lines.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-lg font-bold">Your cart is empty</p>
                <p className="mt-1 text-muted">Add something from the menu to start an order.</p>
                <Link
                  href={menuHref}
                  className="mt-6 inline-grid h-12 place-items-center rounded-full bg-brand px-6 font-bold text-ink"
                >
                  Browse the menu
                </Link>
              </div>
            ) : (
              <form onSubmit={submit} noValidate>
                <section aria-labelledby="items-heading" className="pt-6">
                  <h2 id="items-heading" className="font-display text-lg">
                    Items
                  </h2>
                  <ul className="mt-1">
                    {lines.map((line) => (
                      <CartLineRow key={line.line_id} line={line} />
                    ))}
                  </ul>
                </section>

                <section aria-labelledby="details-heading" className="pt-8">
                  <h2 id="details-heading" className="font-display text-lg">
                    Your details
                  </h2>
                  <div className="mt-4 space-y-5">
                    <Field label="Name" error={errorFor("name")}>
                      <input
                        name="name"
                        autoComplete="name"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        aria-invalid={Boolean(errorFor("name"))}
                        className={inputClass(errorFor("name"))}
                      />
                    </Field>

                    {orderTypes.length > 1 ? (
                      <fieldset>
                        <legend className="w-full">
                          <span className="flex items-baseline justify-between gap-3">
                            <span className="font-bold">Pickup or delivery?</span>
                            {errorFor("orderType") && (
                              <span className="text-xs font-bold text-alert">{errorFor("orderType")}</span>
                            )}
                          </span>
                        </legend>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {orderTypes.map((type) => (
                            <label
                              key={type}
                              className="grid h-12 cursor-pointer place-items-center rounded-xl border border-line font-bold has-checked:border-ink has-checked:bg-ink has-checked:text-page has-disabled:cursor-not-allowed has-disabled:bg-line/40 has-disabled:text-muted has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink"
                            >
                              <input
                                type="radio"
                                name="orderType"
                                value={type}
                                checked={orderType === type}
                                disabled={type === "delivery" && !deliveryAvailable}
                                onChange={() => update("orderType", type)}
                                className="sr-only"
                              />
                              {ORDER_TYPE_LABELS[type]}
                            </label>
                          ))}
                        </div>
                        {settings.accepts_delivery && !deliveryAvailable && (
                          <p className="mt-2 text-sm text-muted">
                            {deliveryHours ? `Delivery runs ${deliveryHours}.` : "Delivery isn’t running right now."}
                          </p>
                        )}
                      </fieldset>
                    ) : (
                      orderType && <p className="font-bold">{ORDER_TYPE_LABELS[orderType]} only</p>
                    )}

                    {orderType === "delivery" && (
                      <>
                        <Field label="Delivery address" error={errorFor("address")}>
                          <input
                            name="address"
                            autoComplete="street-address"
                            placeholder="e.g. 12 Adeola St, Yaba"
                            value={form.address}
                            onChange={(e) => update("address", e.target.value)}
                            aria-invalid={Boolean(errorFor("address"))}
                            className={inputClass(errorFor("address"))}
                          />
                        </Field>
                        <Field label="Landmark" error={errorFor("landmark")}>
                          <input
                            name="landmark"
                            placeholder="e.g. opposite First Bank"
                            value={form.landmark}
                            onChange={(e) => update("landmark", e.target.value)}
                            aria-invalid={Boolean(errorFor("landmark"))}
                            className={inputClass(errorFor("landmark"))}
                          />
                        </Field>
                      </>
                    )}

                    <Field label="Phone" hint="Optional" error={errorFor("phone")}>
                      <input
                        name="phone"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        placeholder="WhatsApp shares your number anyway"
                        value={form.phone}
                        onChange={(e) => update("phone", e.target.value)}
                        aria-invalid={Boolean(errorFor("phone"))}
                        className={inputClass(errorFor("phone"))}
                      />
                    </Field>
                  </div>
                </section>

                <section aria-labelledby="summary-heading" className="pt-8">
                  <h2 id="summary-heading" className="font-display text-lg">
                    Summary
                  </h2>
                  <dl className="mt-3 space-y-2">
                    <div className="flex justify-between gap-4">
                      <dt>Subtotal</dt>
                      <dd className="tabular-nums">{formatNaira(subtotal)}</dd>
                    </div>
                    {orderType === "delivery" && (
                      <div className="flex justify-between gap-4">
                        <dt>Delivery</dt>
                        <dd>Confirmed on WhatsApp</dd>
                      </div>
                    )}
                    <div className="flex justify-between gap-4 border-t border-line pt-2 text-lg font-bold">
                      <dt>Total</dt>
                      <dd className="tabular-nums">{formatNaira(subtotal)}</dd>
                    </div>
                  </dl>
                  <PackagingNote settings={settings} delivery={orderType === "delivery"} />
                </section>

                <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-page px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                  <div className="mx-auto max-w-2xl">
                    {showErrors && soldOut && (
                      <p role="alert" className="mb-2 text-sm font-bold text-alert">
                        Remove sold-out items to place your order.
                      </p>
                    )}
                    <button
                      type="submit"
                      className="h-14 w-full rounded-2xl bg-brand text-lg font-bold text-ink transition-transform active:scale-[0.99]"
                    >
                      Order on WhatsApp · <span className="tabular-nums">{formatNaira(subtotal)}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </>
        )}
      </main>
    </>
  );
}

function CartHeader({ menuHref }: { menuHref: string }) {
  return (
    <header className="border-b border-line">
      <AbulaStripe className="h-1.5" />
      <div className="mx-auto flex max-w-2xl items-center gap-2 px-4 py-3">
        <Link
          href={menuHref}
          aria-label="Back to menu"
          className="-ml-2 grid size-11 place-items-center rounded-full text-2xl"
        >
          ←
        </Link>
        <h1 className="font-display text-2xl">Your order</h1>
      </div>
    </header>
  );
}

function CartLineRow({ line }: { line: CheckedLine }) {
  return (
    <li className="border-b border-line py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <p className={`font-bold ${line.sold_out ? "text-muted" : ""}`}>{line.name}</p>
        <p className="font-bold tabular-nums">{formatNaira(lineTotal(line))}</p>
      </div>
      {line.selected_options.length > 0 && (
        <p className="mt-1 text-sm text-muted">{line.selected_options.map((o) => o.name).join(", ")}</p>
      )}
      {line.note && <p className="mt-1 text-sm text-muted">Note: {line.note}</p>}
      {line.sold_out && (
        <p className="mt-1 text-sm font-bold text-alert">Sold out — remove it to place your order</p>
      )}
      <div className="mt-3 flex items-center justify-between">
        <QuantityStepper
          value={line.quantity}
          onChange={(quantity) => updateQuantity(line.line_id, quantity)}
          label={`Quantity of ${line.name}`}
        />
        <button
          type="button"
          onClick={() => removeFromCart(line.line_id)}
          className="px-2 py-3 text-sm font-bold text-muted underline underline-offset-2"
        >
          Remove<span className="sr-only"> {line.name}</span>
        </button>
      </div>
    </li>
  );
}

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-3">
        <span className="font-bold">{label}</span>
        {(error || hint) && (
          <span className={`text-xs font-bold ${error ? "text-alert" : "text-muted"}`}>{error ?? hint}</span>
        )}
      </span>
      {children}
    </label>
  );
}

function PackagingNote({ settings, delivery }: { settings: BusinessSettings; delivery: boolean }) {
  const fees = settings.delivery_fee_tiers;
  const packs = takeawayPackPrices(settings);
  return (
    <p className="mt-3 text-sm text-muted">
      {delivery && fees.length > 0 && `Delivery is ${formatNairaRange(fees)} depending on your area. `}
      {packs.length > 0 &&
        `Takeaway packs are ${formatNairaRange(packs)} each, added by ${businessShortName(settings)}.`}
    </p>
  );
}
