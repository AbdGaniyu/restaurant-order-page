"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { clearCart } from "@/lib/cart-store";
import type { PreparedOrder } from "@/lib/checkout";
import type { BusinessSettings } from "@/lib/types";
import { copyText, formatWhatsAppNumber } from "@/lib/whatsapp";

interface OrderSentProps {
  order: PreparedOrder;
  settings: BusinessSettings;
  /** Shown automatically when WhatsApp didn't take over the screen, or on request. */
  showFallback: boolean;
  onShowFallback: () => void;
}

/** After "Order on WhatsApp". The cart is kept until "Start a new order", in case WhatsApp never opened. */
export function OrderSent({ order, settings, showFallback, onShowFallback }: OrderSentProps) {
  const router = useRouter();
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  const startNewOrder = () => {
    clearCart();
    router.push(`/r/${settings.slug}`);
  };

  const copy = async () => {
    setCopyState((await copyText(order.message, messageRef.current)) ? "copied" : "failed");
  };

  return (
    <main className="mx-auto w-full max-w-2xl px-4 pt-8 pb-16">
      <h2 className="font-display text-2xl">Almost done</h2>
      <p className="mt-3 text-lg">
        Tap <strong>Send</strong> in WhatsApp to complete your order. Your reference is{" "}
        <strong className="whitespace-nowrap">{order.reference}</strong>.
      </p>

      <div className="mt-6 grid gap-3">
        <button
          type="button"
          onClick={startNewOrder}
          className="h-12 rounded-full bg-brand font-bold text-ink"
        >
          Start a new order
        </button>
        <a
          href={order.url}
          target="_blank"
          rel="noopener noreferrer"
          className="grid h-12 place-items-center rounded-full border border-ink font-bold"
        >
          Open WhatsApp again
        </a>
      </div>

      {showFallback ? (
        <section aria-labelledby="fallback-heading" className="mt-8 rounded-2xl bg-line/50 p-4">
          <h3 id="fallback-heading" className="font-bold">
            WhatsApp didn’t open?
          </h3>
          <p className="mt-1 text-sm">
            Copy your order and send it on WhatsApp to{" "}
            <a
              href={`https://wa.me/${settings.whatsapp_number}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-bold whitespace-nowrap underline underline-offset-2"
            >
              {formatWhatsAppNumber(settings.whatsapp_number)}
            </a>
            .
          </p>
          <textarea
            ref={messageRef}
            readOnly
            value={order.message}
            rows={12}
            aria-label="Your order message"
            className="mt-3 w-full rounded-xl border border-line bg-page p-3 text-sm"
          />
          <button
            type="button"
            onClick={copy}
            className="mt-3 h-12 w-full rounded-full bg-ink font-bold text-page"
          >
            {copyState === "copied" ? "Copied" : "Copy order"}
          </button>
          {copyState === "failed" && (
            <p role="alert" className="mt-2 text-sm">
              Couldn’t copy automatically. The message is selected above — use your phone’s Copy
              option instead.
            </p>
          )}
        </section>
      ) : (
        <button
          type="button"
          onClick={onShowFallback}
          className="mt-8 py-2 text-sm font-bold underline underline-offset-2"
        >
          WhatsApp didn’t open?
        </button>
      )}
    </main>
  );
}
