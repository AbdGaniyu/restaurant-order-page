import { formatNaira } from '../format';
import type { Weekday, WeeklyHours } from '../types';
import { startOfBusinessDay } from './dashboard';

/**
 * Display helpers for the admin. Times are the restaurant's (Lagos), on the 24-hour clock the
 * admin design uses; months and weekdays are spelled out by hand because ICU's short forms vary.
 */

const TIME_ZONE = 'Africa/Lagos';
const DAY_MS = 24 * 60 * 60 * 1000;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

/** Wall-clock parts in Lagos. */
function lagosParts(date: Date) {
  const parts = partsFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
  return {
    day: Number(part('day')),
    month: Number(part('month')) - 1,
    weekday: WEEKDAY_INDEX[part('weekday')],
    hour: Number(part('hour')),
    time: `${part('hour')}:${part('minute')}`,
  };
}

/** "₦58.3k" for the phone's narrow stat tiles; amounts under ₦10,000 stay exact ("₦4,858"). */
export function compactNaira(naira: number): string {
  const oneDecimal = (value: number) => String(Math.round(value * 10) / 10);
  if (naira < 10_000) return formatNaira(naira);
  if (naira < 1_000_000) return `₦${oneDecimal(naira / 1000)}k`;
  return `₦${oneDecimal(naira / 1_000_000)}m`;
}

/** When an order came in: "14:22" today, "Yesterday 20:12", "Sat 19:45" this past week, else "12 Sep, 09:10". */
export function orderTime(createdAt: string | Date, now: Date = new Date()): string {
  const date = new Date(createdAt);
  const { day, month, weekday, time } = lagosParts(date);
  const today = startOfBusinessDay(now).getTime();
  if (date.getTime() >= today) return time;
  if (date.getTime() >= today - DAY_MS) return `Yesterday ${time}`;
  if (date.getTime() >= today - 6 * DAY_MS) return `${WEEKDAYS_SHORT[weekday]} ${time}`;
  return `${day} ${MONTHS[month]}, ${time}`;
}

/** "Good morning" / "Good afternoon" / "Good evening" by the time in Lagos. */
export function greeting(now: Date = new Date()): string {
  const { hour } = lagosParts(now);
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** "Monday 15 September" */
export function longDate(now: Date = new Date()): string {
  const { day, month, weekday } = lagosParts(now);
  return `${WEEKDAYS_LONG[weekday]} ${day} ${MONTHS_LONG[month]}`;
}

/** "Mon 15 Sep" */
export function shortDate(now: Date = new Date()): string {
  const { day, month, weekday } = lagosParts(now);
  return `${WEEKDAYS_SHORT[weekday]} ${day} ${MONTHS[month]}`;
}

const DAY_ORDER: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
const DAY_LABELS: Record<Weekday, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };

/**
 * One line for a week of hours, grouping neighbouring days with the same hours:
 * "Mon–Sat 10:00–22:00 · Sun closed", "Daily 08:00–20:00", "Closed all week".
 */
export function hoursSummary(hours: WeeklyHours): string {
  const describe = (day: Weekday) => {
    const ranges = hours[day] ?? [];
    return ranges.length ? ranges.map(([open, close]) => `${open}–${close}`).join(', ') : 'closed';
  };
  const runs: { from: Weekday; to: Weekday; text: string }[] = [];
  for (const day of DAY_ORDER) {
    const text = describe(day);
    const last = runs.at(-1);
    if (last && last.text === text) last.to = day;
    else runs.push({ from: day, to: day, text });
  }
  if (runs.length === 1) return runs[0].text === 'closed' ? 'Closed all week' : `Daily ${runs[0].text}`;
  return runs
    .map(({ from, to, text }) => `${from === to ? DAY_LABELS[from] : `${DAY_LABELS[from]}–${DAY_LABELS[to]}`} ${text}`)
    .join(' · ');
}

/** "yakoyo-abula.vercel.app/r/yakoyo": the public link as owners read and share it. */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '');
}
