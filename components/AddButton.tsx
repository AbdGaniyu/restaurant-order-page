"use client";

import { useEffect, useRef, useState } from "react";
import { ItemSheet } from "@/components/ItemSheet";
import { buildCartLine } from "@/lib/cart";
import { addToCart } from "@/lib/cart-store";
import type { MenuItemView } from "@/lib/menu";

/** Items with options open the sheet; plain items go straight into the cart. */
export function AddButton({ item }: { item: MenuItemView }) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const addedTimer = useRef<number>(undefined);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => clearTimeout(addedTimer.current), []);

  const confirmAdded = () => {
    setJustAdded(true);
    clearTimeout(addedTimer.current);
    addedTimer.current = window.setTimeout(() => setJustAdded(false), 1200);
  };

  const onClick = () => {
    if (item.option_groups.length > 0) {
      setSheetOpen(true);
      return;
    }
    addToCart(buildCartLine(item, {}, 1, ""));
    confirmAdded();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={onClick}
        aria-label={`Add ${item.name}`}
        className={`h-10 w-22 rounded-full font-bold transition-[transform,background-color] active:scale-95 ${
          justAdded ? "bg-ink text-page" : "bg-brand text-ink"
        }`}
      >
        {justAdded ? "Added" : "Add"}
      </button>
      {sheetOpen && (
        <ItemSheet
          item={item}
          onClose={() => {
            setSheetOpen(false);
            // Safari doesn't focus buttons on tap, so the dialog has nowhere to return focus to.
            buttonRef.current?.focus({ preventScroll: true });
          }}
          onAdded={confirmAdded}
        />
      )}
    </>
  );
}
