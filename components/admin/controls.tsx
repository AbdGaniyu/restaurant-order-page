"use client";

import { useOptimistic, useState, useTransition, type ReactNode } from "react";
import type { ActionResult } from "@/app/admin/actions";

/**
 * Runs a server action with a pending flag and the action's error message. Every admin control
 * saves through this, so they all behave the same: optimistic where it matters, plain errors.
 */
export function useSave() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = (action: () => Promise<ActionResult>, onDone?: () => void, onError?: () => void) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if ("error" in result) {
        setError(result.error);
        onError?.();
      } else {
        onDone?.();
      }
    });

  return { save, pending, error };
}

export function ErrorText({ error, className = "" }: { error: string | null; className?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className={`text-sm font-bold text-alert ${className}`}>
      {error}
    </p>
  );
}

/** An on/off switch big enough for a thumb. The label is what it means when on. */
export function Switch({
  checked,
  onChange,
  label,
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="grid h-11 w-14 shrink-0 place-items-center disabled:opacity-60"
    >
      <span
        aria-hidden
        className={`flex h-7 w-12 items-center rounded-full p-1 transition-colors ${checked ? "bg-ewedu" : "bg-line"}`}
      >
        <span
          className={`size-5 rounded-full bg-page shadow transition-transform ${checked ? "translate-x-5" : ""}`}
        />
      </span>
    </button>
  );
}

/**
 * A switch that flips at once and saves in the background. If the save fails it flips back
 * (useOptimistic returns to the server's value) and shows why.
 */
export function SavingSwitch({
  checked,
  label,
  onToggle,
  caption,
}: {
  checked: boolean;
  label: string;
  onToggle: (next: boolean) => Promise<ActionResult>;
  /** Shown under the switch, e.g. ["Available", "Sold out"] for on and off. */
  caption?: [on: string, off: string];
}) {
  const [shown, setShown] = useOptimistic(checked);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (next: boolean) =>
    startTransition(async () => {
      setShown(next);
      setError(null);
      const result = await onToggle(next);
      if ("error" in result) setError(result.error);
    });

  return (
    <div className="flex shrink-0 flex-col items-center">
      <Switch checked={shown} onChange={toggle} label={label} />
      {caption && <span className="-mt-1 text-xs text-muted">{shown ? caption[0] : caption[1]}</span>}
      <ErrorText error={error} className="max-w-32 text-center text-xs" />
    </div>
  );
}

/** Inline text that saves when the field loses focus or on Enter, and only if it changed. */
export function InlineTextInput({
  value: saved,
  label,
  onSave,
  className = "",
}: {
  value: string;
  label: string;
  onSave: (value: string) => Promise<ActionResult>;
  className?: string;
}) {
  const [value, setValue] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  const { save, pending, error } = useSave();

  if (saved !== lastSaved && value === lastSaved) {
    setLastSaved(saved);
    setValue(saved);
  }

  const commit = () => {
    if (value.trim() === lastSaved) return;
    save(
      () => onSave(value),
      () => setLastSaved(value.trim()),
    );
  };

  return (
    <div className={className}>
      <input
        aria-label={label}
        aria-invalid={Boolean(error)}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.currentTarget.blur();
        }}
        className={`h-11 w-full rounded-xl border border-transparent px-2 font-bold outline-none hover:border-line focus:border-ink ${pending ? "opacity-60" : ""}`}
      />
      <ErrorText error={error} className="mt-1 px-2" />
    </div>
  );
}

/**
 * Inline naira price: saves when the field loses focus or on Enter, and only if it changed.
 * The value shown is whole naira; the action converts to kobo.
 */
export function PriceInput({
  kobo,
  label,
  onSave,
  className = "",
}: {
  kobo: number;
  label: string;
  onSave: (price: string) => Promise<ActionResult>;
  className?: string;
}) {
  const saved = String(kobo / 100);
  const [value, setValue] = useState(saved);
  const [lastSaved, setLastSaved] = useState(saved);
  const { save, pending, error } = useSave();

  // A new price from the server (e.g. another device) replaces the field unless it's being edited.
  if (saved !== lastSaved && value === lastSaved) {
    setLastSaved(saved);
    setValue(saved);
  }

  const commit = () => {
    const trimmed = value.replace(/[₦,\s]/g, "");
    if (trimmed === lastSaved) return;
    save(
      () => onSave(value),
      () => setLastSaved(trimmed),
    );
  };

  return (
    <div className={className}>
      <label className="flex h-11 items-center rounded-xl border border-line px-3 focus-within:border-ink">
        <span aria-hidden className="text-muted">
          ₦
        </span>
        <input
          inputMode="numeric"
          aria-label={label}
          aria-invalid={Boolean(error)}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === "Enter") event.currentTarget.blur();
          }}
          className={`w-full min-w-0 bg-transparent pl-1 font-bold tabular-nums outline-none ${pending ? "opacity-60" : ""}`}
        />
      </label>
      <ErrorText error={error} className="mt-1" />
    </div>
  );
}

export function Section({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="pt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-lg">{title}</h2>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export const inputClass =
  "h-12 w-full rounded-xl border border-line bg-page px-3 text-base outline-none focus:border-ink aria-invalid:border-alert";

export const primaryButton =
  "h-12 rounded-full bg-ink px-6 font-bold text-page disabled:opacity-60 transition-transform active:scale-[0.99]";

export const secondaryButton = "h-12 rounded-full border border-ink px-5 font-bold disabled:opacity-60";
