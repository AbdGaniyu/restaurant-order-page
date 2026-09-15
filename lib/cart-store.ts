import { useSyncExternalStore } from 'react';
import { analytics } from './analytics';
import { addLine, parseCart, removeLine, setLineQuantity } from './cart';
import type { CartLine } from './types';

/**
 * The cart for the restaurant in the URL (/r/<slug>/…), shared by every component that calls
 * useCart() and saved to localStorage per restaurant. useSyncExternalStore renders the server
 * snapshot (empty) during hydration, so the saved cart appears right after mount without a
 * hydration mismatch.
 */

const STORAGE_PREFIX = 'cart_v1:';
const EMPTY: CartLine[] = [];

let lines: CartLine[] | null = null;
let linesKey: string | null = null;
const listeners = new Set<() => void>();

/** Each restaurant keeps its own cart. The slug comes from the URL, so no component has to pass it down. */
function storageKey(): string {
  const slug = window.location.pathname.match(/^\/r\/([^/]+)/)?.[1] ?? '';
  return STORAGE_PREFIX + decodeURIComponent(slug);
}

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null; // private mode or storage blocked: the cart still works for this visit
  }
}

function getSnapshot(): CartLine[] {
  const key = storageKey();
  if (lines === null || linesKey !== key) {
    lines = parseCart(readStorage(key));
    linesKey = key;
  }
  return lines;
}

function commit(next: CartLine[]) {
  const key = storageKey();
  lines = next;
  linesKey = key;
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {}
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the cart.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== storageKey()) return;
    lines = null;
    listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
}

const subscribeToNothing = () => () => {};

/** False on the server and during hydration, while useCart() still reports the empty placeholder. */
export function useCartLoaded(): boolean {
  return useSyncExternalStore(subscribeToNothing, () => true, () => false);
}

/** Every way into the cart (straight Add or the options sheet) goes through here, so it's tracked once. */
export function addToCart(line: CartLine) {
  commit(addLine(getSnapshot(), line));
  analytics.addToCart(line.menu_item_id);
}

export function updateQuantity(lineId: string, quantity: number) {
  commit(setLineQuantity(getSnapshot(), lineId, quantity));
}

export function removeFromCart(lineId: string) {
  commit(removeLine(getSnapshot(), lineId));
}

export function clearCart() {
  commit([]);
}
