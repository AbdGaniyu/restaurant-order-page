import { describe, expect, it } from 'vitest';
import { dashboardStats, startOfBusinessDay, startOfBusinessWeek } from './dashboard';

/** A Lagos wall-clock time (WAT, UTC+1). */
const lagos = (local: string) => new Date(`${local}:00+01:00`);

describe('startOfBusinessDay', () => {
  it('is midnight in Lagos, not UTC', () => {
    expect(startOfBusinessDay(lagos('2026-09-15T14:22'))).toEqual(lagos('2026-09-15T00:00'));
  });

  it('puts 00:30 Lagos on the new day even though it is still the previous day in UTC', () => {
    expect(startOfBusinessDay(lagos('2026-09-16T00:30'))).toEqual(lagos('2026-09-16T00:00'));
  });
});

describe('startOfBusinessWeek', () => {
  it('is the Monday midnight on or before the date, in Lagos', () => {
    for (let offset = 0; offset < 14; offset++) {
      const date = new Date(lagos('2026-09-10T12:00').getTime() + offset * 86_400_000);
      const start = startOfBusinessWeek(date);
      const lagosStart = new Date(start.getTime() + 3_600_000);
      expect(lagosStart.getUTCDay()).toBe(1);
      expect(lagosStart.getUTCHours()).toBe(0);
      expect(start.getTime()).toBeLessThanOrEqual(date.getTime());
      expect(date.getTime() - start.getTime()).toBeLessThan(7 * 86_400_000);
    }
  });
});

describe('dashboardStats', () => {
  const now = lagos('2026-09-15T15:00');
  const orders = [
    { created_at: lagos('2026-09-15T14:22').toISOString(), total_kobo: 850000, status: 'sent' },
    { created_at: lagos('2026-09-15T13:05').toISOString(), total_kobo: 500000, status: 'confirmed' },
    { created_at: lagos('2026-09-15T12:40').toISOString(), total_kobo: 750000, status: 'cancelled' },
    { created_at: lagos('2026-09-14T21:00').toISOString(), total_kobo: 650000, status: 'sent' },
  ];

  it("counts today's orders and takings in Lagos, leaving out cancelled ones", () => {
    expect(dashboardStats(orders, now)).toEqual({
      ordersToday: 2,
      totalTodayKobo: 1350000,
      averageKobo: 675000,
      newOrders: 2,
    });
  });

  it('rounds the average to whole naira', () => {
    const three = [100000, 100000, 100100].map((total_kobo) => ({ created_at: now.toISOString(), total_kobo, status: 'sent' }));
    expect(dashboardStats(three, now).averageKobo).toBe(100000);
  });

  it('is all zeros with no orders', () => {
    expect(dashboardStats([], now)).toEqual({ ordersToday: 0, totalTodayKobo: 0, averageKobo: 0, newOrders: 0 });
  });
});
