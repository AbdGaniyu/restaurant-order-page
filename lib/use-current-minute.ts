"use client";

import { useSyncExternalStore } from "react";

export const MINUTE_MS = 60_000;

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 15_000);
  return () => clearInterval(id);
}

const getSnapshot = () => Math.floor(Date.now() / MINUTE_MS);
const getServerSnapshot = () => null;

/**
 * Minutes since the epoch, ticking on the client. Null on the server and during
 * hydration, so time-dependent UI renders after mount without a mismatch.
 */
export function useCurrentMinute(): number | null {
  return useSyncExternalStore<number | null>(subscribe, getSnapshot, getServerSnapshot);
}
