"use client";

import type { DayHoursInput } from "@/app/admin/actions";
import { WEEKDAY_ORDER } from "@/lib/admin/validation";
import type { Weekday, WeeklyHours } from "@/lib/types";
import { cx, btnGhost, btnSecondary, inputClass, Switch } from "./ui";

export type HoursValue = Record<Weekday, DayHoursInput>;

const SHORT: Record<Weekday, string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const LONG: Record<Weekday, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

/** Mon–Sat 10:00–22:00, Sunday closed: the design's starting point for a new restaurant. */
export const DEFAULT_HOURS: HoursValue = Object.fromEntries(
  WEEKDAY_ORDER.map((day) => [day, { closed: day === "sun", open: "10:00", close: "22:00" }]),
) as HoursValue;

/** Stored hours → the editor's shape. One range per day (the first, if a day somehow has several). */
export function toDayInputs(hours: WeeklyHours): HoursValue {
  return Object.fromEntries(
    WEEKDAY_ORDER.map((day) => {
      const range = hours?.[day]?.[0];
      return [day, range ? { closed: false, open: range[0], close: range[1] } : { closed: true, open: "10:00", close: "22:00" }];
    }),
  ) as HoursValue;
}

/**
 * A week of opening hours: a switch per day and its opening and closing times. "Same every day"
 * opens every day with Monday's hours; "Copy Mon to all" gives Monday's hours to the days that
 * are open and leaves closed days closed. `compact` is the phone layout, `full` the desktop one.
 * Shared by onboarding step 2 and Settings.
 */
export function HoursEditor({
  value,
  onChange,
  variant,
}: {
  value: HoursValue;
  onChange: (value: HoursValue) => void;
  variant: "compact" | "full";
}) {
  const full = variant === "full";
  const setDay = (day: Weekday, entry: Partial<DayHoursInput>) => onChange({ ...value, [day]: { ...value[day], ...entry } });
  const withMondayHours = (keepClosed: boolean) =>
    onChange(
      Object.fromEntries(
        WEEKDAY_ORDER.map((day) => [
          day,
          keepClosed && value[day].closed && day !== "mon"
            ? value[day]
            : { closed: keepClosed ? value[day].closed : false, open: value.mon.open, close: value.mon.close },
        ]),
      ) as HoursValue,
    );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => withMondayHours(false)} className={cx(`${btnSecondary} min-h-11`)}>
          Same every day
        </button>
        <button type="button" onClick={() => withMondayHours(true)} className={cx(`${btnGhost} px-2`)}>
          Copy Mon to all
        </button>
      </div>

      <ul className="border-t border-admin-divider">
        {WEEKDAY_ORDER.map((day) => {
          const entry = value[day];
          return (
            <li
              key={day}
              className={`grid min-h-[52px] items-center border-b border-admin-divider ${
                full ? "grid-cols-[104px_minmax(0,1fr)_auto] gap-4" : "grid-cols-[44px_minmax(0,1fr)_auto] gap-3"
              }`}
            >
              <span className={`font-extrabold ${full ? "text-sm" : "text-[13px]"}`}>{full ? LONG[day] : SHORT[day]}</span>
              {entry.closed ? (
                <span className="text-sm text-admin-muted">Closed</span>
              ) : full ? (
                <span className="flex items-center gap-2">
                  <input
                    type="time"
                    aria-label={`${LONG[day]} opens`}
                    value={entry.open}
                    onChange={(event) => setDay(day, { open: event.target.value })}
                    className={cx(`${inputClass} min-h-10 w-[110px] text-sm`)}
                  />
                  <span className="text-admin-muted">to</span>
                  <input
                    type="time"
                    aria-label={`${LONG[day]} closes`}
                    value={entry.close}
                    onChange={(event) => setDay(day, { close: event.target.value })}
                    className={cx(`${inputClass} min-h-10 w-[110px] text-sm`)}
                  />
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm tabular-nums">
                  <input
                    type="time"
                    aria-label={`${LONG[day]} opens`}
                    value={entry.open}
                    onChange={(event) => setDay(day, { open: event.target.value })}
                    className="min-h-11 min-w-0 rounded bg-transparent"
                  />
                  <span aria-hidden>–</span>
                  <input
                    type="time"
                    aria-label={`${LONG[day]} closes`}
                    value={entry.close}
                    onChange={(event) => setDay(day, { close: event.target.value })}
                    className="min-h-11 min-w-0 rounded bg-transparent"
                  />
                </span>
              )}
              <Switch checked={!entry.closed} onChange={(open) => setDay(day, { closed: !open })} label={`Open on ${LONG[day]}`} />
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-admin-muted">A closing time earlier than the opening time means after midnight.</p>
    </div>
  );
}
