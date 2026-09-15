import { describe, expect, it } from 'vitest';
import { closingTime } from '../hours';
import type { WeeklyHours } from '../types';
import { compactNaira, displayUrl, greeting, hoursSummary, longDate, orderTime, shortDate } from './format';

/** A Lagos wall-clock time (WAT, UTC+1). 2026-09-15 is a Tuesday. */
const lagos = (local: string) => new Date(`${local}:00+01:00`);

const week = (ranges: Partial<Record<keyof WeeklyHours, [string, string][]>>): WeeklyHours => ({
  mon: [],
  tue: [],
  wed: [],
  thu: [],
  fri: [],
  sat: [],
  sun: [],
  ...ranges,
});

describe('compactNaira', () => {
  it.each([
    [4858, '₦4,858'],
    [58300, '₦58.3k'],
    [58000, '₦58k'],
    [250000, '₦250k'],
    [1250000, '₦1.3m'],
  ])('%i → %s', (naira, label) => {
    expect(compactNaira(naira)).toBe(label);
  });
});

describe('orderTime', () => {
  const now = lagos('2026-09-15T15:00');
  it.each([
    ['2026-09-15T14:22', '14:22'],
    ['2026-09-15T00:05', '00:05'],
    ['2026-09-14T20:12', 'Yesterday 20:12'],
    ['2026-09-12T19:45', 'Sat 19:45'],
    ['2026-09-01T09:10', '1 Sep, 09:10'],
  ])('%s → %s', (at, label) => {
    expect(orderTime(lagos(at), now)).toBe(label);
  });

  it('uses Lagos time, not UTC, for "today"', () => {
    // 23:30 UTC on the 14th is 00:30 on the 15th in Lagos.
    expect(orderTime(new Date('2026-09-14T23:30:00Z'), now)).toBe('00:30');
  });
});

describe('dates and greeting', () => {
  it('writes the date out in full and short', () => {
    expect(longDate(lagos('2026-09-15T10:00'))).toBe('Tuesday 15 September');
    expect(shortDate(lagos('2026-09-15T10:00'))).toBe('Tue 15 Sep');
  });

  it('greets by the time in Lagos', () => {
    expect(greeting(lagos('2026-09-15T09:00'))).toBe('Good morning');
    expect(greeting(lagos('2026-09-15T14:00'))).toBe('Good afternoon');
    expect(greeting(lagos('2026-09-15T19:00'))).toBe('Good evening');
  });
});

describe('hoursSummary', () => {
  const open = [['10:00', '22:00']] as [string, string][];

  it('groups neighbouring days with the same hours', () => {
    expect(hoursSummary(week({ mon: open, tue: open, wed: open, thu: open, fri: open, sat: open }))).toBe(
      'Mon–Sat 10:00–22:00 · Sun closed',
    );
  });

  it('says "Daily" when every day matches, and handles a closed week', () => {
    const daily = week(Object.fromEntries(['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'].map((d) => [d, open])));
    expect(hoursSummary(daily)).toBe('Daily 10:00–22:00');
    expect(hoursSummary(week({}))).toBe('Closed all week');
  });

  it('keeps single days and split days apart', () => {
    expect(hoursSummary(week({ mon: open, wed: [['08:00', '12:00'], ['14:00', '20:00']] }))).toBe(
      'Mon 10:00–22:00 · Tue closed · Wed 08:00–12:00, 14:00–20:00 · Thu–Sun closed',
    );
  });
});

describe('closingTime', () => {
  const hours = week({ tue: [['10:00', '22:00']], fri: [['18:00', '02:00']] });

  it('is the end of the range the business is in', () => {
    expect(closingTime(hours, lagos('2026-09-15T14:00'))).toBe('22:00');
  });

  it('is null when closed by its hours', () => {
    expect(closingTime(hours, lagos('2026-09-15T23:00'))).toBeNull();
  });

  it('follows a range past midnight into the next day', () => {
    // Friday 18 September 18:00 – Saturday 02:00.
    expect(closingTime(hours, lagos('2026-09-19T01:00'))).toBe('02:00');
  });
});

describe('displayUrl', () => {
  it('drops the protocol', () => {
    expect(displayUrl('https://yakoyo-abula.vercel.app/r/yakoyo')).toBe('yakoyo-abula.vercel.app/r/yakoyo');
  });
});
