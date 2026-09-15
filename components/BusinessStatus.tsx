"use client";

import { getBusinessStatus, type BusinessStatus } from "@/lib/hours";
import type { BusinessSettings } from "@/lib/types";
import { MINUTE_MS, useCurrentMinute } from "@/lib/use-current-minute";

/** Open/closed is computed on the device and re-checked every minute, so a statically built page never shows a stale status. */
function useBusinessStatus(settings: BusinessSettings): BusinessStatus | null {
  const minute = useCurrentMinute();
  return minute === null ? null : getBusinessStatus(settings, new Date(minute * MINUTE_MS));
}

export function OpenPill({ settings }: { settings: BusinessSettings }) {
  const status = useBusinessStatus(settings);
  const isOpen = status?.isOpen ?? true;

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-page px-3 py-1 text-sm font-bold ${status ? "" : "invisible"}`}
    >
      <span aria-hidden className={`size-2 rounded-full ${isOpen ? "bg-ewedu" : "bg-muted"}`} />
      {isOpen ? "Open now" : "Closed"}
    </span>
  );
}

export function ClosedBanner({ settings }: { settings: BusinessSettings }) {
  const status = useBusinessStatus(settings);
  if (!status || status.isOpen) return null;

  return (
    <div role="status" className="bg-ink text-page">
      <p className="mx-auto max-w-2xl px-4 py-3 text-sm">
        <strong>
          We’re closed right now{status.opensAt && ` — opens ${status.opensAt}`}.
        </strong>{" "}
        You can still send your order and it’ll go through as a pre-order.
      </p>
    </div>
  );
}
