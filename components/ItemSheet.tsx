"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { QuantityStepper } from "@/components/QuantityStepper";
import { buildCartLine, lineTotal, NOTE_MAX_LENGTH } from "@/lib/cart";
import { addToCart } from "@/lib/cart-store";
import { formatNaira } from "@/lib/format";
import type { MenuItemView } from "@/lib/menu";
import { groupHint, isGroupFull, selectionErrors, toggleOption, type Selection } from "@/lib/selection";

interface ItemSheetProps {
  item: MenuItemView;
  onClose: () => void;
  onAdded: () => void;
}

/** Bottom sheet for items with options. Mounted only while open; closing unmounts it. */
export function ItemSheet({ item, onClose, onAdded }: ItemSheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [selection, setSelection] = useState<Selection>({});
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const errors = selectionErrors(item, selection);
  const line = buildCartLine(item, selection, quantity, note);
  const headingId = `sheet-${item.id}`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const firstIncomplete = item.option_groups.find((group) => errors[group.id]);
    if (firstIncomplete) {
      setShowErrors(true);
      dialogRef.current
        ?.querySelector(`[data-group="${firstIncomplete.id}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    addToCart(line);
    onAdded();
    dialogRef.current?.close();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={headingId}
      onClose={onClose}
      // A click on the dialog element itself is a click on the backdrop.
      onClick={(event) => event.target === event.currentTarget && dialogRef.current?.close()}
      className="sheet"
    >
      <form onSubmit={submit} noValidate className="flex max-h-[88dvh] flex-col">
        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pt-5 pb-6">
          <div className="flex items-start justify-between gap-4">
            <h2 id={headingId} className="text-xl font-bold">
              {item.name}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="-mt-1 -mr-2 grid size-10 shrink-0 place-items-center rounded-full text-2xl leading-none text-muted"
            >
              ×
            </button>
          </div>
          {item.description && <p className="mt-1 text-sm text-muted">{item.description}</p>}

          {item.option_groups.map((group) => {
            const error = showErrors ? errors[group.id] : undefined;
            const chosen = selection[group.id] ?? [];
            const full = isGroupFull(selection, group);
            return (
              <fieldset key={group.id} data-group={group.id} className="mt-6">
                <legend className="w-full">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-bold">{group.name}</span>
                    <span className={`text-xs font-bold ${error ? "text-alert" : "text-muted"}`}>
                      {error ?? groupHint(group)}
                    </span>
                  </span>
                </legend>
                <div
                  className={`mt-2 divide-y divide-line rounded-xl border ${error ? "border-alert" : "border-line"}`}
                >
                  {group.options.map((option) => {
                    const checked = chosen.includes(option.id);
                    const disabled = !option.is_available || (full && !checked);
                    return (
                      <label
                        key={option.id}
                        className="flex min-h-12 items-center gap-3 px-3 py-2 has-disabled:text-muted"
                      >
                        <input
                          type={group.selection_type === "single" ? "radio" : "checkbox"}
                          name={group.id}
                          value={option.id}
                          checked={checked}
                          disabled={disabled}
                          onChange={() => setSelection((s) => toggleOption(s, group, option.id))}
                          className="size-5 shrink-0 accent-ink"
                        />
                        <span className="flex-1">{option.name}</span>
                        {!option.is_available ? (
                          <span className="text-xs font-bold uppercase">Sold out</span>
                        ) : (
                          option.price_delta > 0 && (
                            <span className="text-sm text-muted tabular-nums">
                              +{formatNaira(option.price_delta)}
                            </span>
                          )
                        )}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          <label className="mt-6 block">
            <span className="flex items-baseline justify-between gap-3">
              <span className="font-bold">Note for the kitchen</span>
              <span className="text-xs font-bold text-muted">Optional</span>
            </span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={NOTE_MAX_LENGTH}
              rows={2}
              placeholder="e.g. extra pepper"
              className="mt-2 w-full resize-none rounded-xl border border-line p-3 text-base"
            />
          </label>
        </div>

        <div className="flex items-center gap-3 border-t border-line px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          <QuantityStepper value={quantity} onChange={setQuantity} label={`Quantity of ${item.name}`} />
          <button
            type="submit"
            className="h-12 flex-1 rounded-full bg-brand px-4 font-bold text-ink transition-transform active:scale-[0.98]"
          >
            Add to order · <span className="tabular-nums">{formatNaira(lineTotal(line))}</span>
          </button>
        </div>
      </form>
    </dialog>
  );
}
