"use client";

import Image from "next/image";
import {
  useEffect,
  useId,
  useOptimistic,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type PointerEvent,
  type ReactNode,
} from "react";
import { twMerge } from "tailwind-merge";
import type { ActionResult } from "@/app/admin/actions";

/**
 * Admin building blocks from the "Admin Screens" design: Modernist (Archivo, flush-left labels,
 * visible rules) softened with an off-white ground, white cards, 8px controls and pill switches.
 * The restaurant's accent drives primary buttons, switches, active nav and progress.
 */

// Classes ------------------------------------------------------------------------

/** Joins class names; when two set the same property, the later one wins (so per-use overrides work). */
export const cx = (...classes: (string | false | null | undefined)[]) => twMerge(classes.filter(Boolean).join(" "));

export const btnPrimary =
  "inline-flex whitespace-nowrap min-h-12 items-center justify-start gap-2 rounded-lg bg-accent px-4 text-[15px] font-extrabold text-admin-bg transition-colors hover:bg-accent-600 active:bg-accent-700 disabled:cursor-not-allowed disabled:opacity-45";

export const btnSecondary =
  "inline-flex whitespace-nowrap min-h-12 items-center justify-start gap-2 rounded-lg border border-admin-divider bg-white px-4 text-[15px] font-extrabold text-admin-text transition-colors hover:bg-admin-text/5 active:bg-admin-text/10 disabled:cursor-not-allowed disabled:opacity-45";

export const btnGhost =
  "inline-flex whitespace-nowrap min-h-11 items-center justify-start rounded-lg px-1 text-[15px] font-extrabold text-accent transition-colors hover:bg-accent/10 active:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-45";

export const inputClass =
  "min-h-12 w-full rounded-lg border border-admin-divider bg-white px-3 text-base text-admin-text caret-accent outline-none placeholder:text-admin-neutral-500 hover:border-admin-text/45 focus-visible:border-accent aria-invalid:border-alert";

export const sectionLabel = "text-[11px] tracking-[0.08em] text-admin-muted uppercase";

// Saving -------------------------------------------------------------------------

/** Runs a server action with a pending flag and its error message. */
export function useSave() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const save = (action: () => Promise<ActionResult>, onDone?: (result: ActionResult) => void) =>
    startTransition(async () => {
      setError(null);
      const result = await action();
      if ("error" in result) setError(result.error);
      else onDone?.(result);
    });

  return { save, pending, error, setError };
}

/**
 * A switch value that flips at once and saves in the background. If the save fails it flips back
 * (useOptimistic returns to the server's value) and `error` says why. Rows use `shown` to fade.
 */
export function useOptimisticToggle(value: boolean, action: (next: boolean) => Promise<ActionResult>) {
  const [shown, setShown] = useOptimistic(value);
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const toggle = (next: boolean) =>
    startTransition(async () => {
      setShown(next);
      setError(null);
      const result = await action(next);
      if ("error" in result) setError(result.error);
    });

  return { shown, toggle, error };
}

export function ErrorText({ error, className = "" }: { error: string | null | undefined; className?: string }) {
  if (!error) return null;
  return (
    <p role="alert" className={`text-sm font-semibold text-alert ${className}`}>
      {error}
    </p>
  );
}

// Layout helpers -----------------------------------------------------------------

const DESKTOP_QUERY = "(min-width: 1024px)";

/** True at the desktop layout (side nav, inline edit panel). False on the server and on phones. */
export function useIsDesktop(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(DESKTOP_QUERY);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => false,
  );
}

/** The phone's 56px title bar. Hidden at desktop, where each page has its own heading. */
export function AppBar({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="sticky top-0 z-20 flex min-h-14 items-center justify-between gap-3 border-b border-admin-divider bg-admin-bg pr-2 pl-5 lg:hidden">
      <h1 className="truncate text-lg font-extrabold">{title}</h1>
      {action}
    </div>
  );
}

/** The desktop page heading row: title (and subtitle) left, actions right, over a rule. */
export function PageHeading({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="hidden items-end justify-between gap-4 border-b border-admin-divider pb-4 lg:flex">
      <div>
        <h1 className="text-[32px] leading-[1.12] font-extrabold tracking-[-0.015em]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] text-admin-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs text-admin-muted">{label}</span>
      {children}
      {hint && <span className="text-xs text-admin-muted">{hint}</span>}
    </label>
  );
}

/** "₦" box + numeric input, as in the design's price and phone fields. */
export function PrefixedInput({
  prefix,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { prefix: string }) {
  return (
    <span className="flex">
      <span className="grid min-h-12 shrink-0 place-items-center rounded-l-lg border border-r-0 border-admin-divider bg-admin-neutral-200 px-3 text-[15px]">
        {prefix}
      </span>
      <input {...props} className={cx(`${inputClass} rounded-l-none ${className}`)} />
    </span>
  );
}

// Controls -----------------------------------------------------------------------

/** Pill switch: 44×26 (md) or 56×32 (lg) on a 44px tap target; accent track when on. */
export function Switch({
  checked,
  onChange,
  label,
  size = "md",
  disabled = false,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  size?: "md" | "lg";
  disabled?: boolean;
}) {
  const large = size === "lg";
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-full disabled:opacity-45"
    >
      <span
        aria-hidden
        className={`flex rounded-full transition-colors ${large ? "h-8 w-14 p-[3px]" : "h-[26px] w-11 p-0.5"} ${
          checked ? "justify-end bg-accent" : "justify-start bg-admin-neutral-400"
        }`}
      >
        <span
          className={`block rounded-full bg-white shadow-[0_1px_2px_rgb(45_43_43/0.14)] ${large ? "size-[26px]" : "size-[22px]"}`}
        />
      </span>
    </button>
  );
}

/** Today / This week: native radios styled as one segmented control, accent fill on the selected one. */
export function SegmentedFilter<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
  label: string;
}) {
  const name = useId();
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex overflow-hidden rounded-lg border border-admin-divider bg-white">
      {options.map((option, index) => (
        <label
          key={option.id}
          className={`grid min-h-11 cursor-pointer place-items-center px-3.5 text-[13px] font-semibold has-checked:bg-accent has-checked:text-admin-bg has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-accent ${
            index > 0 ? "border-l border-admin-divider" : ""
          }`}
        >
          <input
            type="radio"
            name={name}
            value={option.id}
            checked={value === option.id}
            onChange={() => onChange(option.id)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}

/** The four accent swatches; the selected one gets a 2px ink ring. */
export function AccentPicker({
  value,
  options,
  onChange,
  size = 44,
}: {
  value: string;
  options: { hex: string; name: string }[];
  onChange: (hex: string) => void;
  size?: number;
}) {
  const choices = options.some((option) => option.hex.toLowerCase() === value.toLowerCase())
    ? options
    : [{ hex: value, name: "Current" }, ...options];
  return (
    <div role="radiogroup" aria-label="Accent colour" className="flex flex-wrap gap-1.5">
      {choices.map((option) => {
        const selected = option.hex.toLowerCase() === value.toLowerCase();
        return (
          <button
            key={option.hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={option.name}
            onClick={() => onChange(option.hex)}
            style={{ width: size, height: size, background: option.hex }}
            className={`shrink-0 cursor-pointer rounded-full ${selected ? "outline-2 outline-offset-2 outline-admin-text" : ""}`}
          />
        );
      })}
    </div>
  );
}

// Display ------------------------------------------------------------------------

/** The restaurant's logo, or its initial on the accent colour when there's no logo. */
export function LogoTile({ name, logoUrl, size = 36 }: { name: string; logoUrl: string | null; size?: number }) {
  if (logoUrl) {
    return (
      <span style={{ width: size, height: size }} className="relative shrink-0 overflow-hidden rounded-[10px] bg-white">
        <Image src={logoUrl} alt="" fill sizes={`${size}px`} className="object-contain" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      className="grid shrink-0 place-items-center rounded-[10px] bg-accent font-extrabold text-white"
    >
      {name.trim().charAt(0).toUpperCase() || "M"}
    </span>
  );
}

/** Dashboard number tile: tinted icon, label, large numeral. */
export function StatTile({
  label,
  value,
  icon,
  accent = false,
}: {
  label: string;
  value: ReactNode;
  icon: ReactNode;
  accent?: boolean;
}) {
  return (
    <div className="rounded-xl border border-admin-divider bg-white p-5">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-100 text-accent">{icon}</span>
        <span className="text-xs text-admin-muted">{label}</span>
      </div>
      <div
        className={`mt-1.5 text-[40px] leading-[1.1] font-extrabold tracking-[-0.02em] tabular-nums lg:mt-2 lg:text-[44px] ${
          accent ? "text-accent" : ""
        }`}
      >
        {value}
      </div>
    </div>
  );
}

/** Onboarding progress on the phone: three 4px segments and "Step 2 of 3". */
export function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div aria-hidden className="grid gap-1" style={{ gridTemplateColumns: `repeat(${total}, 1fr)` }}>
        {Array.from({ length: total }, (_, index) => (
          <span key={index} className={`h-1 rounded-sm ${index < step ? "bg-accent" : "bg-admin-neutral-300"}`} />
        ))}
      </div>
      <p className={sectionLabel}>
        Step {step} of {total}
      </p>
    </div>
  );
}

// Sheet --------------------------------------------------------------------------

/**
 * The phone's bottom sheet: a native modal <dialog> that springs up (350 ms) and can be dragged
 * down by its handle; letting go past 30% of its height dismisses it. Motion is off under
 * prefers-reduced-motion (globals.css). `children` and `footer` receive `close`.
 */
export function BottomSheet({
  title,
  headerAction,
  onClose,
  children,
  footer,
}: {
  title: ReactNode;
  headerAction?: (close: () => void) => ReactNode;
  onClose: () => void;
  children: (close: () => void) => ReactNode;
  footer?: (close: () => void) => ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const dragStart = useRef<{ y: number; height: number } | null>(null);
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  // Closing goes through state so `close` can be handed to render functions without reading the ref.
  useEffect(() => {
    if (closing) dialogRef.current?.close();
  }, [closing]);

  const close = () => setClosing(true);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    dragStart.current = { y: event.clientY, height: dialogRef.current?.offsetHeight ?? 1 };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStart.current) setOffset(Math.max(0, event.clientY - dragStart.current.y));
  };
  const onPointerEnd = () => {
    const start = dragStart.current;
    dragStart.current = null;
    setDragging(false);
    if (start && offset > start.height * 0.3) close();
    else setOffset(0);
  };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="admin-sheet"
      style={{ transform: offset ? `translateY(${offset}px)` : undefined, transition: dragging ? "none" : undefined }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        className="grid h-6 shrink-0 cursor-grab touch-none place-items-center active:cursor-grabbing"
      >
        <span aria-hidden className="block h-1 w-10 bg-admin-neutral-400" />
      </div>
      <div className="flex shrink-0 items-center justify-between gap-3 border-b border-admin-divider px-5 pt-1 pb-3">
        <h2 id={titleId} className="truncate text-lg font-extrabold">
          {title}
        </h2>
        {headerAction?.(close)}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children(close)}</div>
      {footer && (
        <div className="flex shrink-0 gap-2 border-t border-admin-divider px-5 pt-3 pb-[max(2rem,env(safe-area-inset-bottom))]">
          {footer(close)}
        </div>
      )}
    </dialog>
  );
}
