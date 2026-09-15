import { describe, expect, it } from 'vitest';
import {
  formatSentAt,
  formatDailyHours,
  formatNextOpening,
  formatTime,
  formatTimeRange,
  getBusinessStatus,
  isWithinHours,
  nextOpening,
  WEEKDAYS,
} from './hours';
import { pilotMenu } from './test-fixtures';
import type { BusinessSettings, TimeRange, WeeklyHours } from './types';

/** A Lagos wall-clock time. 2026-09-11 is a Friday. */
const lagos = (local: string) => new Date(`${local}:00+01:00`);

const daily = (...ranges: TimeRange[]): WeeklyHours =>
  Object.fromEntries(WEEKDAYS.map((day) => [day, ranges])) as WeeklyHours;

const walkIn = daily(['07:30', '23:30']);
const delivery = daily(['08:30', '20:00']);

describe('isWithinHours', () => {
  it('opens at 7:30 and closes at 23:30', () => {
    expect(isWithinHours(walkIn, lagos('2026-09-11T07:29'))).toBe(false);
    expect(isWithinHours(walkIn, lagos('2026-09-11T07:30'))).toBe(true);
    expect(isWithinHours(walkIn, lagos('2026-09-11T23:29'))).toBe(true);
    expect(isWithinHours(walkIn, lagos('2026-09-11T23:30'))).toBe(false);
  });

  it('reads the clock in Lagos, not UTC', () => {
    // 23:10 UTC Friday is 00:10 Saturday in Lagos.
    expect(isWithinHours(walkIn, new Date('2026-09-11T23:10:00Z'))).toBe(false);
    // 06:45 UTC is 07:45 in Lagos.
    expect(isWithinHours(walkIn, new Date('2026-09-11T06:45:00Z'))).toBe(true);
  });

  it('treats an empty day as closed', () => {
    const closedSunday = { ...walkIn, sun: [] };
    expect(isWithinHours(closedSunday, lagos('2026-09-13T12:00'))).toBe(false);
    expect(isWithinHours(closedSunday, lagos('2026-09-14T12:00'))).toBe(true);
  });

  it('carries a range that ends after midnight into the next day', () => {
    const lateSaturday = { ...walkIn, sat: [['18:00', '02:00'] as TimeRange] };
    expect(isWithinHours(lateSaturday, lagos('2026-09-13T01:30'))).toBe(true);
    expect(isWithinHours(lateSaturday, lagos('2026-09-13T02:00'))).toBe(false);
  });
});

describe('nextOpening', () => {
  it('finds a later opening today', () => {
    const next = nextOpening(walkIn, lagos('2026-09-11T06:00'));
    expect(next).toEqual({ daysFromToday: 0, weekday: 'fri', time: '07:30' });
    expect(formatNextOpening(next!)).toBe('7:30 AM');
  });

  it('rolls over to tomorrow after closing', () => {
    const next = nextOpening(walkIn, lagos('2026-09-11T23:45'));
    expect(next).toEqual({ daysFromToday: 1, weekday: 'sat', time: '07:30' });
    expect(formatNextOpening(next!)).toBe('tomorrow at 7:30 AM');
  });

  it('skips closed days', () => {
    const weekdaysOnly = { ...walkIn, sat: [], sun: [] };
    const next = nextOpening(weekdaysOnly, lagos('2026-09-11T23:45'));
    expect(next).toEqual({ daysFromToday: 3, weekday: 'mon', time: '07:30' });
    expect(formatNextOpening(next!)).toBe('Monday at 7:30 AM');
  });

  it('returns null for a schedule that never opens', () => {
    expect(nextOpening(daily(), lagos('2026-09-11T12:00'))).toBeNull();
  });
});

describe('formatTime', () => {
  it('uses a 12-hour clock', () => {
    expect(formatTime('07:30')).toBe('7:30 AM');
    expect(formatTime('12:00')).toBe('12:00 PM');
    expect(formatTime('00:00')).toBe('12:00 AM');
    expect(formatTime('23:30')).toBe('11:30 PM');
    expect(formatTimeRange(['08:30', '20:00'])).toBe('8:30 AM – 8:00 PM');
  });
});

describe('formatSentAt', () => {
  it('shows the Lagos date and time', () => {
    expect(formatSentAt(lagos('2026-09-11T14:14'))).toBe('11 Sep, 2:14 PM');
    // 23:30 UTC is already the next day in Lagos.
    expect(formatSentAt(new Date('2026-09-11T23:30:00Z'))).toBe('12 Sep, 12:30 AM');
  });
});

describe('formatDailyHours', () => {
  it('summarises a schedule that is the same every day', () => {
    expect(formatDailyHours(walkIn)).toBe('7:30 AM – 11:30 PM');
    expect(formatDailyHours(daily(['08:00', '14:00'], ['17:00', '22:00']))).toBe(
      '8:00 AM – 2:00 PM, 5:00 PM – 10:00 PM',
    );
  });

  it('returns null when days differ or the schedule is empty', () => {
    expect(formatDailyHours({ ...walkIn, sun: [] })).toBeNull();
    expect(formatDailyHours(daily())).toBeNull();
  });
});

describe('getBusinessStatus', () => {
  const base: BusinessSettings = {
    ...pilotMenu.business_settings,
    opening_hours: walkIn,
    delivery_hours: delivery,
    accepts_delivery: true,
    is_open_override: null,
  };

  it('is open with delivery during the day', () => {
    expect(getBusinessStatus(base, lagos('2026-09-11T12:00'))).toEqual({
      isOpen: true,
      opensAt: null,
      deliveryAvailable: true,
    });
  });

  it('is open for walk-in but not delivery outside delivery hours', () => {
    expect(getBusinessStatus(base, lagos('2026-09-11T08:00')).deliveryAvailable).toBe(false);
    expect(getBusinessStatus(base, lagos('2026-09-11T20:00')).deliveryAvailable).toBe(false);
    expect(getBusinessStatus(base, lagos('2026-09-11T20:00')).isOpen).toBe(true);
  });

  it('says when it opens next while closed', () => {
    expect(getBusinessStatus(base, lagos('2026-09-11T06:00'))).toEqual({
      isOpen: false,
      opensAt: '7:30 AM',
      deliveryAvailable: false,
    });
  });

  it('lets the owner force the shop closed', () => {
    expect(getBusinessStatus({ ...base, is_open_override: false }, lagos('2026-09-11T12:00'))).toEqual({
      isOpen: false,
      opensAt: null,
      deliveryAvailable: false,
    });
  });

  it('lets the owner force the shop open, without extending delivery hours', () => {
    const status = getBusinessStatus({ ...base, is_open_override: true }, lagos('2026-09-11T02:00'));
    expect(status.isOpen).toBe(true);
    expect(status.deliveryAvailable).toBe(false);
  });

  it('never offers delivery when the business does not accept it', () => {
    const status = getBusinessStatus({ ...base, accepts_delivery: false }, lagos('2026-09-11T12:00'));
    expect(status.deliveryAvailable).toBe(false);
  });
});
