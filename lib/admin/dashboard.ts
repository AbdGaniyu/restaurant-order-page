/**
 * Numbers for the admin dashboard and the Orders "Today / This week" filter. "Today" is the
 * restaurant's day in Lagos (WAT is UTC+1 all year, no daylight saving), whatever the device's zone.
 */

const LAGOS_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Midnight in Lagos on the day `date` falls on, as an instant. */
export function startOfBusinessDay(date: Date): Date {
  const lagos = new Date(date.getTime() + LAGOS_OFFSET_MS);
  return new Date(Date.UTC(lagos.getUTCFullYear(), lagos.getUTCMonth(), lagos.getUTCDate()) - LAGOS_OFFSET_MS);
}

/** Monday midnight in Lagos of the week `date` falls in. */
export function startOfBusinessWeek(date: Date): Date {
  const day = startOfBusinessDay(date);
  const daysSinceMonday = (new Date(day.getTime() + LAGOS_OFFSET_MS).getUTCDay() + 6) % 7;
  return new Date(day.getTime() - daysSinceMonday * DAY_MS);
}

export interface DashboardOrder {
  created_at: string;
  total_kobo: number;
  status: string;
}

export interface DashboardStats {
  ordersToday: number;
  totalTodayKobo: number;
  /** Whole naira, in kobo; 0 with no orders. */
  averageKobo: number;
  /** Orders still marked New (not yet confirmed, done or cancelled), any day. */
  newOrders: number;
}

/** Cancelled orders don't count towards today's orders or takings. */
export function dashboardStats(orders: DashboardOrder[], now: Date = new Date()): DashboardStats {
  const since = startOfBusinessDay(now).getTime();
  const today = orders.filter((order) => order.status !== 'cancelled' && new Date(order.created_at).getTime() >= since);
  const total = today.reduce((sum, order) => sum + order.total_kobo, 0);
  return {
    ordersToday: today.length,
    totalTodayKobo: total,
    averageKobo: today.length ? Math.round(total / today.length / 100) * 100 : 0,
    newOrders: orders.filter((order) => order.status === 'sent').length,
  };
}
