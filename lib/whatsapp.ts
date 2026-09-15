/** The message is the plain string; this is the one place it gets encoded. */
export function whatsappUrl(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
}

/** "2347025973433" → "+234 702 597 3433" */
export function formatWhatsAppNumber(number: string): string {
  const digits = number.replace(/\D/g, '');
  if (digits.length === 13 && digits.startsWith('234')) {
    return `+234 ${digits.slice(3, 6)} ${digits.slice(6, 9)} ${digits.slice(9)}`;
  }
  return `+${digits}`;
}

/** New tab where allowed (the app takes over on phones); same tab if a popup blocker refuses. */
export function openWhatsApp(url: string) {
  const tab = window.open(url, '_blank');
  if (tab) tab.opener = null;
  else window.location.href = url;
}

/**
 * Calls onStayed if this page is still visible and focused after `ms` — WhatsApp
 * didn't take over, which is common on desktop. Returns a function that cancels the check.
 */
export function watchForStayingHere(ms: number, onStayed: () => void): () => void {
  let left = false;
  const onBlur = () => {
    left = true;
  };
  const onVisibility = () => {
    if (document.visibilityState === 'hidden') left = true;
  };
  const stop = () => {
    clearTimeout(timer);
    window.removeEventListener('blur', onBlur);
    document.removeEventListener('visibilitychange', onVisibility);
  };
  const timer = window.setTimeout(() => {
    stop();
    if (!left && document.visibilityState === 'visible' && document.hasFocus()) onStayed();
  }, ms);
  window.addEventListener('blur', onBlur);
  document.addEventListener('visibilitychange', onVisibility);
  return stop;
}

/** Clipboard API first; the selected-textarea fallback covers older browsers and plain-http testing. */
export async function copyText(text: string, fallbackField: HTMLTextAreaElement | null): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    if (!fallbackField) return false;
    fallbackField.select();
    return document.execCommand('copy');
  }
}
