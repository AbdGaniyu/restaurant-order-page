"use client";

import { useState, type FormEvent } from "react";
import { saveSettings, setLogo, type DayHoursInput, type SettingsInput } from "@/app/admin/actions";
import { WEEKDAY_ORDER } from "@/lib/admin/validation";
import type { Weekday, WeeklyHours } from "@/lib/types";
import { ErrorText, inputClass, primaryButton, Section, Switch, useSave } from "./controls";
import { PhotoUpload } from "./PhotoUpload";

export interface SettingsValues {
  id: string;
  slug: string;
  name: string;
  whatsappNumber: string;
  address: string;
  mapsUrl: string;
  acceptsPickup: boolean;
  acceptsDelivery: boolean;
  openingHours: WeeklyHours;
  deliveryHours: WeeklyHours;
  accentHex: string;
  logoUrl: string | null;
  isOpenOverride: boolean | null;
  isPublished: boolean;
}

const DAY_LABELS: Record<Weekday, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

/** The editor shows one range per day (the first, if a day somehow has several). */
function toDayInputs(hours: WeeklyHours): Record<Weekday, DayHoursInput> {
  return Object.fromEntries(
    WEEKDAY_ORDER.map((day) => {
      const range = hours?.[day]?.[0];
      return [day, range ? { closed: false, open: range[0], close: range[1] } : { closed: true, open: "08:00", close: "20:00" }];
    }),
  ) as Record<Weekday, DayHoursInput>;
}

export function SettingsTab({ restaurant }: { restaurant: SettingsValues }) {
  const [form, setForm] = useState<SettingsInput>({
    name: restaurant.name,
    whatsappNumber: restaurant.whatsappNumber,
    address: restaurant.address,
    mapsUrl: restaurant.mapsUrl,
    acceptsPickup: restaurant.acceptsPickup,
    acceptsDelivery: restaurant.acceptsDelivery,
    openingHours: toDayInputs(restaurant.openingHours),
    deliveryHours: toDayInputs(restaurant.deliveryHours),
    accentHex: restaurant.accentHex,
    openOverride: restaurant.isOpenOverride === null ? "schedule" : restaurant.isOpenOverride ? "open" : "closed",
    isPublished: restaurant.isPublished,
  });
  const [saved, setSaved] = useState(false);
  const { save, pending, error } = useSave();
  const logo = useSave();

  const update = <K extends keyof SettingsInput>(field: K, value: SettingsInput[K]) => {
    setSaved(false);
    setForm((current) => ({ ...current, [field]: value }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    save(
      () => saveSettings(form),
      () => setSaved(true),
    );
  };

  return (
    <form onSubmit={submit} noValidate>
      <Section title="Restaurant">
        <div className="space-y-4">
          <Field label="Name">
            <input value={form.name} onChange={(event) => update("name", event.target.value)} className={inputClass} />
          </Field>
          <Field label="WhatsApp number for orders" hint="With country code; Nigerian numbers can start with 0">
            <input
              type="tel"
              inputMode="tel"
              value={form.whatsappNumber}
              onChange={(event) => update("whatsappNumber", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Address" hint="Optional">
            <input value={form.address} onChange={(event) => update("address", event.target.value)} className={inputClass} />
          </Field>
          <Field label="Google Maps link" hint="Optional, for the Directions link">
            <input
              type="url"
              inputMode="url"
              placeholder="https://maps.app.goo.gl/…"
              value={form.mapsUrl}
              onChange={(event) => update("mapsUrl", event.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </Section>

      <Section title="Look">
        <div className="flex items-center gap-4">
          <PhotoUpload
            restaurantId={restaurant.id}
            name="logo"
            currentUrl={restaurant.logoUrl}
            label={restaurant.logoUrl ? "Change logo" : "Add logo"}
            onUploaded={setLogo}
            size={80}
          />
          <div className="text-sm">
            <p className="font-bold">Logo</p>
            <p className="text-muted">Shown on a white circle at the top of the menu.</p>
            {restaurant.logoUrl && (
              <button
                type="button"
                disabled={logo.pending}
                onClick={() => logo.save(() => setLogo(null))}
                className="mt-1 h-11 font-bold underline underline-offset-2"
              >
                Remove logo
              </button>
            )}
            <ErrorText error={logo.error} />
          </div>
        </div>
        <label className="mt-5 flex items-center gap-3">
          <input
            type="color"
            value={form.accentHex}
            onChange={(event) => update("accentHex", event.target.value.toUpperCase())}
            className="size-12 shrink-0 cursor-pointer rounded-xl border border-line bg-page p-1"
          />
          <span>
            <span className="block font-bold">Accent colour</span>
            <span className="block text-sm text-muted">The menu header and buttons. {form.accentHex}</span>
          </span>
        </label>
      </Section>

      <Section title="Ordering">
        <div className="space-y-1">
          <ToggleRow
            label="Pickup"
            checked={form.acceptsPickup}
            onChange={(value) => update("acceptsPickup", value)}
          />
          <ToggleRow
            label="Delivery"
            checked={form.acceptsDelivery}
            onChange={(value) => update("acceptsDelivery", value)}
          />
          <ToggleRow
            label="Menu visible to customers"
            hint={form.isPublished ? `Live at /r/${restaurant.slug}` : "Hidden: the link shows “not found”"}
            checked={form.isPublished}
            onChange={(value) => update("isPublished", value)}
          />
        </div>

        <fieldset className="mt-5">
          <legend className="font-bold">Open right now?</legend>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {(
              [
                ["schedule", "Follow hours"],
                ["open", "Open"],
                ["closed", "Closed"],
              ] as const
            ).map(([value, label]) => (
              <label
                key={value}
                className="grid h-12 cursor-pointer place-items-center rounded-xl border border-line text-sm font-bold has-checked:border-ink has-checked:bg-ink has-checked:text-page has-focus-visible:outline-2 has-focus-visible:outline-ink"
              >
                <input
                  type="radio"
                  name="openOverride"
                  value={value}
                  checked={form.openOverride === value}
                  onChange={() => update("openOverride", value)}
                  className="sr-only"
                />
                {label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">
            “Closed” shows a closed banner; customers can still send orders as pre-orders.
          </p>
        </fieldset>
      </Section>

      <Section title="Opening hours">
        <HoursEditor value={form.openingHours} onChange={(value) => update("openingHours", value)} />
      </Section>

      {form.acceptsDelivery && (
        <Section title="Delivery hours">
          <HoursEditor value={form.deliveryHours} onChange={(value) => update("deliveryHours", value)} />
        </Section>
      )}

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-8 border-t border-line bg-page px-4 py-3">
        <ErrorText error={error} className="mb-2" />
        {saved && !error && (
          <p role="status" className="mb-2 text-sm font-bold text-ewedu">
            Saved. The menu is updated.
          </p>
        )}
        <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-bold">{label}</span>
      {hint && <span className="mt-0.5 block text-sm text-muted">{hint}</span>}
      <span className="mt-2 block">{children}</span>
    </label>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="font-bold">{label}</p>
        {hint && <p className="text-sm text-muted">{hint}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

function HoursEditor({
  value,
  onChange,
}: {
  value: Record<Weekday, DayHoursInput>;
  onChange: (value: Record<Weekday, DayHoursInput>) => void;
}) {
  const setDay = (day: Weekday, entry: Partial<DayHoursInput>) => onChange({ ...value, [day]: { ...value[day], ...entry } });

  return (
    <>
      <ul className="space-y-2">
        {WEEKDAY_ORDER.map((day) => {
          const entry = value[day];
          return (
            <li key={day} className="flex items-center gap-2">
              <span className="w-10 shrink-0 font-bold">{DAY_LABELS[day]}</span>
              <Switch
                checked={!entry.closed}
                onChange={(open) => setDay(day, { closed: !open })}
                label={`Open on ${DAY_LABELS[day]}`}
              />
              {entry.closed ? (
                <span className="text-muted">Closed</span>
              ) : (
                <span className="flex min-w-0 flex-1 items-center gap-1">
                  <input
                    type="time"
                    aria-label={`${DAY_LABELS[day]} opens`}
                    value={entry.open}
                    onChange={(event) => setDay(day, { open: event.target.value })}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-line px-2"
                  />
                  <span aria-hidden>–</span>
                  <input
                    type="time"
                    aria-label={`${DAY_LABELS[day]} closes`}
                    value={entry.close}
                    onChange={(event) => setDay(day, { close: event.target.value })}
                    className="h-11 min-w-0 flex-1 rounded-xl border border-line px-2"
                  />
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={() => onChange(Object.fromEntries(WEEKDAY_ORDER.map((day) => [day, { ...value.mon }])) as typeof value)}
        className="mt-2 h-11 text-sm font-bold underline underline-offset-2"
      >
        Copy Monday to every day
      </button>
      <p className="text-sm text-muted">A closing time earlier than opening means after midnight.</p>
    </>
  );
}
