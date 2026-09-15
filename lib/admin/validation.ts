import type { TimeRange, Weekday, WeeklyHours } from '../types';

/**
 * Parsing for what owners type into the admin. Everything returns null when the input
 * isn't usable, so actions can answer with a plain message instead of a database error.
 */

const MAX_PRICE_NAIRA = 10_000_000;

/** "1,500", "₦1500" or " 1500 " → 150000 kobo. Whole naira only (the schema stores multiples of 100). */
export function parseNairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, '');
  if (!/^\d+$/.test(cleaned)) return null;
  const naira = Number(cleaned);
  return naira <= MAX_PRICE_NAIRA ? naira * 100 : null;
}

/**
 * A WhatsApp number in E.164 ("+2348031234567"). Nigerian local numbers ("0803 123 4567")
 * get +234; anything else must already carry its country code.
 */
export function normalizeWhatsAppNumber(input: string): string | null {
  const trimmed = input.trim();
  const digits = trimmed.replace(/\D/g, '');
  let e164: string;
  if (trimmed.startsWith('+')) e164 = `+${digits}`;
  else if (/^0\d{10}$/.test(digits)) e164 = `+234${digits.slice(1)}`;
  else e164 = `+${digits}`;
  return /^\+[1-9]\d{6,14}$/.test(e164) ? e164 : null;
}

/** "Yàkoyó Abula Joint" → "yakoyo-abula-joint". Matches the restaurants.slug check. */
export function slugify(name: string): string {
  const slug = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
    .replace(/-+$/, '');
  return slug || 'restaurant';
}

/** Order-reference prefix from the name: initials of up to three words ("Sample Kitchen" → "SK"). */
export function orderPrefixFor(name: string): string {
  const words = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .split(/[^A-Z]+/)
    .filter(Boolean);
  if (words.length === 0) return 'OR';
  const prefix = words.length === 1 ? words[0].slice(0, 2) : words.slice(0, 3).map((word) => word[0]).join('');
  return prefix.length >= 2 ? prefix : 'OR';
}

export function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export const WEEKDAY_ORDER: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

const isTime = (value: unknown): value is string =>
  typeof value === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);

/**
 * A week of hours from the settings form: per day either closed or one opening range.
 * Closing at or before opening means past midnight, as elsewhere in the app.
 */
export function parseWeeklyHours(days: Partial<Record<Weekday, { closed: boolean; open: string; close: string }>>): WeeklyHours | null {
  const hours = {} as WeeklyHours;
  for (const day of WEEKDAY_ORDER) {
    const entry = days[day];
    if (!entry) return null;
    if (entry.closed) {
      hours[day] = [];
      continue;
    }
    if (!isTime(entry.open) || !isTime(entry.close) || entry.open === entry.close) return null;
    hours[day] = [[entry.open, entry.close] satisfies TimeRange];
  }
  return hours;
}

/** A trimmed single line of 1–max characters; null when blank, too long or not a string. */
export function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== 'string') return null;
  const text = value.replace(/\s+/g, ' ').trim();
  return text && text.length <= max ? text : null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}
