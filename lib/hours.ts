import type { BusinessSettings, TimeRange, Weekday, WeeklyHours } from './types';

/** Hours in business_settings are Lagos wall-clock times (WAT, UTC+1, no DST), whatever the device's time zone. */
export const BUSINESS_TIME_ZONE = 'Africa/Lagos';

/** Indexed like Date#getDay(): 0 = Sunday. */
export const WEEKDAYS: Weekday[] = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

const WEEKDAY_NAMES: Record<Weekday, string> = {
  sun: 'Sunday',
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
};

const clockFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** Day of week (0 = Sunday) and minutes since midnight at the restaurant. */
function businessClock(date: Date): { day: number; minutes: number } {
  const parts = clockFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
  return {
    day: WEEKDAYS.indexOf(part('weekday').toLowerCase() as Weekday),
    minutes: Number(part('hour')) * 60 + Number(part('minute')),
  };
}

/** "07:30" → 450 */
export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function isOvernight([start, end]: TimeRange): boolean {
  return toMinutes(end) <= toMinutes(start);
}

export function isWithinHours(hours: WeeklyHours, date: Date = new Date()): boolean {
  const { day, minutes } = businessClock(date);
  const today = hours[WEEKDAYS[day]] ?? [];
  const yesterday = hours[WEEKDAYS[(day + 6) % 7]] ?? [];
  return (
    today.some(
      (range) => minutes >= toMinutes(range[0]) && (isOvernight(range) || minutes < toMinutes(range[1])),
    ) || yesterday.some((range) => isOvernight(range) && minutes < toMinutes(range[1]))
  );
}

/** When the opening range the business is in right now ends ("22:00"), or null when it's closed by its hours. */
export function closingTime(hours: WeeklyHours, date: Date = new Date()): string | null {
  const { day, minutes } = businessClock(date);
  const today = hours[WEEKDAYS[day]] ?? [];
  const yesterday = hours[WEEKDAYS[(day + 6) % 7]] ?? [];
  const current =
    today.find((range) => minutes >= toMinutes(range[0]) && (isOvernight(range) || minutes < toMinutes(range[1]))) ??
    yesterday.find((range) => isOvernight(range) && minutes < toMinutes(range[1]));
  return current ? current[1] : null;
}

export interface NextOpening {
  /** 0 = later today, 1 = tomorrow, up to 7 = same weekday next week. */
  daysFromToday: number;
  weekday: Weekday;
  time: string;
}

/** The next time the schedule opens, looking up to a week ahead; null if it never opens. */
export function nextOpening(hours: WeeklyHours, date: Date = new Date()): NextOpening | null {
  const { day, minutes } = businessClock(date);
  for (let offset = 0; offset <= 7; offset++) {
    const weekday = WEEKDAYS[(day + offset) % 7];
    const starts = (hours[weekday] ?? [])
      .map(([start]) => start)
      .filter((start) => offset > 0 || toMinutes(start) > minutes)
      .sort((a, b) => toMinutes(a) - toMinutes(b));
    if (starts.length > 0) return { daysFromToday: offset, weekday, time: starts[0] };
  }
  return null;
}

/** "20:00" → "8:00 PM" */
export function formatTime(time: string): string {
  const total = toMinutes(time) % (24 * 60);
  const hours = Math.floor(total / 60);
  const minutes = String(total % 60).padStart(2, '0');
  return `${hours % 12 || 12}:${minutes} ${hours < 12 ? 'AM' : 'PM'}`;
}

/** ["08:30", "20:00"] → "8:30 AM – 8:00 PM" */
export function formatTimeRange([start, end]: TimeRange): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const sentAtFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: BUSINESS_TIME_ZONE,
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

/** "11 Sep, 2:14 PM" in Lagos time. Built by hand: ICU's month names ("Sept") and spacing vary by version. */
export function formatSentAt(date: Date): string {
  const parts = sentAtFormatter.formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)!.value;
  return `${Number(part('day'))} ${MONTHS[Number(part('month')) - 1]}, ${formatTime(`${part('hour')}:${part('minute')}`)}`;
}

/** "7:30 AM – 11:30 PM" when every day has the same hours; null when they vary or it never opens. */
export function formatDailyHours(hours: WeeklyHours): string | null {
  const days = new Set(WEEKDAYS.map((day) => JSON.stringify(hours[day] ?? [])));
  const ranges = hours.mon ?? [];
  if (days.size !== 1 || ranges.length === 0) return null;
  return ranges.map(formatTimeRange).join(', ');
}

/** Completes "opens …": "7:30 AM", "tomorrow at 7:30 AM", "Monday at 7:30 AM". */
export function formatNextOpening({ daysFromToday, weekday, time }: NextOpening): string {
  if (daysFromToday === 0) return formatTime(time);
  if (daysFromToday === 1) return `tomorrow at ${formatTime(time)}`;
  return `${WEEKDAY_NAMES[weekday]} at ${formatTime(time)}`;
}

export interface BusinessStatus {
  isOpen: boolean;
  /** For the closed banner; null while open, or when the owner has forced the shop closed. */
  opensAt: string | null;
  deliveryAvailable: boolean;
}

export function getBusinessStatus(settings: BusinessSettings, date: Date = new Date()): BusinessStatus {
  const forcedClosed = settings.is_open_override === false;
  const isOpen = settings.is_open_override ?? isWithinHours(settings.opening_hours, date);
  const next = isOpen || forcedClosed ? null : nextOpening(settings.opening_hours, date);
  return {
    isOpen,
    opensAt: next && formatNextOpening(next),
    deliveryAvailable:
      settings.accepts_delivery && !forcedClosed && isWithinHours(settings.delivery_hours, date),
  };
}
