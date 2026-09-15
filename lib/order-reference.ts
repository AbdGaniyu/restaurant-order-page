/** No 0/O/1/I, so a reference read aloud or retyped can't be misread. 32 characters: a byte % 32 has no bias. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/** "YK-A7F3K". Week 1 generates it on the device; week 2 generates it on insert. */
export function generateOrderReference(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(5));
  return `YK-${Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('')}`;
}
