"use client";

import Link from "next/link";
import { analytics } from "@/lib/analytics";
import { cartItemCount, cartSubtotal } from "@/lib/cart";
import { useCart } from "@/lib/cart-store";
import { formatNaira } from "@/lib/format";

/** "2 items · ₦6,800 · View cart", pinned to the bottom. Hidden while the cart is empty. */
export function CartBar() {
  const lines = useCart();
  const count = cartItemCount(lines);
  if (count === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      <Link
        href="/cart"
        onClick={analytics.checkoutStarted}
        className="pointer-events-auto mx-auto flex h-14 max-w-2xl items-center justify-between gap-4 rounded-2xl bg-ink px-5 text-page shadow-lg shadow-ink/25"
      >
        <span aria-live="polite" className="font-bold tabular-nums">
          <span key={count} className="bump inline-block">
            {count} {count === 1 ? "item" : "items"}
          </span>{" "}
          · {formatNaira(cartSubtotal(lines))}
        </span>
        <span className="font-bold">View cart</span>
      </Link>
    </div>
  );
}
