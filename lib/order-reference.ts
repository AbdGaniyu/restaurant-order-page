/** No 0/O/1/I, so a reference read aloud or retyped can't be misread. 32 characters: a byte % 32 has no bias. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** "YK-A7F3K" for prefix "YK". Generated on the device so the WhatsApp message and the logged order share it. */
export function generateOrderReference(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return `${prefix}-${Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('')}`;
}

export function isOrderReference(reference: string, prefix: string): boolean {
  return new RegExp(`^${prefix}-[${ALPHABET}]{5}$`).test(reference);
}
