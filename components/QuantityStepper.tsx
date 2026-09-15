"use client";

import { MAX_QUANTITY } from "@/lib/cart";

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Names what is being counted for screen readers, e.g. "Quantity of Amala". */
  label: string;
  min?: number;
}

export function QuantityStepper({ value, onChange, label, min = 1 }: QuantityStepperProps) {
  const buttonClass =
    "grid size-11 place-items-center rounded-full text-xl font-bold disabled:opacity-30";

  return (
    <div role="group" aria-label={label} className="inline-flex items-center rounded-full border border-line">
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        className={buttonClass}
      >
        −
      </button>
      <output aria-live="polite" className="min-w-7 text-center font-bold tabular-nums">
        {value}
      </output>
      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= MAX_QUANTITY}
        onClick={() => onChange(value + 1)}
        className={buttonClass}
      >
        +
      </button>
    </div>
  );
}
