"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { saveSettings, setLogo, signOut, type SettingsInput } from "@/app/admin/actions";
import { hoursSummary } from "@/lib/admin/format";
import { uploadPhoto } from "@/lib/admin/upload-photo";
import { parseWeeklyHours } from "@/lib/admin/validation";
import type { WeeklyHours } from "@/lib/types";
import { HoursEditor, toDayInputs, type HoursValue } from "./HoursEditor";
import { PublicLinkCard } from "./PublicLink";
import {
  cx,
  AccentPicker,
  AppBar,
  BottomSheet,
  btnPrimary,
  btnSecondary,
  ErrorText,
  Field,
  inputClass,
  LogoTile,
  PageHeading,
  sectionLabel,
  Switch,
  useSave,
} from "./ui";

/** The four accents the design offers; each reads against the menu's light ground. */
export const ACCENTS = [
  { hex: "#F96406", name: "Orange" },
  { hex: "#1F7A4D", name: "Green" },
  { hex: "#1D4ED8", name: "Blue" },
  { hex: "#201E1D", name: "Black" },
];

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

/** One bordered block on the phone; plain spacing in the desktop columns. */
const block = "border-b border-admin-divider px-5 py-3 lg:border-0 lg:px-0 lg:py-0";

/**
 * Settings: public link and QR, opening hours, WhatsApp number, address, accent colour and logo,
 * plus name, map link, pickup/delivery and visibility. The phone scrolls, with hours collapsed to
 * a row that opens the editor; desktop shows hours and restaurant details side by side.
 * The open/closed override lives on the dashboard, so it's carried through unchanged here.
 */
export function SettingsTab({ restaurant, publicUrl }: { restaurant: SettingsValues; publicUrl: string }) {
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
  const [editingHours, setEditingHours] = useState<"openingHours" | "deliveryHours" | null>(null);
  const [saved, setSaved] = useState(false);
  const { save, pending, error } = useSave();

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

  const summary = (hours: HoursValue) => {
    const parsed = parseWeeklyHours(hours);
    return parsed ? hoursSummary(parsed) : "Check the times";
  };

  const saveButton = (className = "") => (
    <button type="submit" disabled={pending} className={cx(`${btnPrimary} ${className}`)}>
      {pending ? "Saving…" : "Save changes"}
    </button>
  );

  return (
    <form onSubmit={submit} noValidate className="lg:px-10 lg:py-8">
      <AppBar title="Settings" />
      <PageHeading title="Settings" action={saveButton("min-h-10")} />

      <div className="lg:grid lg:grid-cols-2 lg:gap-x-12 lg:pt-6">
        {/* Left column on desktop: opening (and delivery) hours. On the phone: link, then an hours row. */}
        <div className="flex flex-col lg:gap-4">
          <div className={cx(`${block} flex flex-col gap-3 py-4 lg:hidden`)}>
            <p className={sectionLabel}>Public link</p>
            <PublicLinkCard url={publicUrl} slug={restaurant.slug} variant="mobile" />
          </div>
          <HoursRow label="Opening hours" summary={summary(form.openingHours)} onOpen={() => setEditingHours("openingHours")} />

          <div className="hidden lg:flex lg:flex-col lg:gap-4">
            <SectionTitle>Opening hours</SectionTitle>
            <HoursEditor value={form.openingHours} onChange={(value) => update("openingHours", value)} variant="full" />
            {form.acceptsDelivery && (
              <>
                <SectionTitle>Delivery hours</SectionTitle>
                <HoursEditor value={form.deliveryHours} onChange={(value) => update("deliveryHours", value)} variant="full" />
              </>
            )}
          </div>
        </div>

        {/* Right column on desktop: restaurant details, public link, the rest. */}
        <div className="flex flex-col lg:gap-5">
          <div className="hidden lg:block">
            <SectionTitle>Restaurant</SectionTitle>
          </div>
          <div className={block}>
            <Field label="WhatsApp number" hint="With the country code, or a Nigerian number starting with 0.">
              <input
                type="tel"
                inputMode="tel"
                value={form.whatsappNumber}
                onChange={(event) => update("whatsappNumber", event.target.value)}
                className={cx(`${inputClass} lg:min-h-11`)}
              />
            </Field>
          </div>
          <div className={block}>
            <Field label="Address">
              <input
                value={form.address}
                onChange={(event) => update("address", event.target.value)}
                className={cx(`${inputClass} lg:min-h-11`)}
              />
            </Field>
          </div>
          <div className={cx(`${block} grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3`)}>
            <span className="flex flex-col">
              <span className="text-[15px] font-extrabold lg:text-sm">Accent colour</span>
              <span className="text-[13px] text-admin-muted lg:text-xs">Buttons and highlights on your menu</span>
            </span>
            <AccentPicker value={form.accentHex} options={ACCENTS} onChange={(hex) => update("accentHex", hex)} />
          </div>
          <div className={block}>
            <LogoField restaurantId={restaurant.id} name={form.name} logoUrl={restaurant.logoUrl} />
          </div>

          <div className="hidden lg:flex lg:flex-col lg:gap-4">
            <SectionTitle>Public link</SectionTitle>
            <PublicLinkCard url={publicUrl} slug={restaurant.slug} variant="desktop" />
          </div>

          <div className="px-5 pt-5 pb-1 lg:px-0 lg:pt-2 lg:pb-0">
            <SectionTitle>More</SectionTitle>
          </div>
          <div className={block}>
            <Field label="Restaurant name">
              <input value={form.name} onChange={(event) => update("name", event.target.value)} className={cx(`${inputClass} lg:min-h-11`)} />
            </Field>
          </div>
          <div className={block}>
            <Field label="Google Maps link" hint="Optional. Adds a Directions link to the menu.">
              <input
                type="url"
                inputMode="url"
                placeholder="https://maps.app.goo.gl/…"
                value={form.mapsUrl}
                onChange={(event) => update("mapsUrl", event.target.value)}
                className={cx(`${inputClass} lg:min-h-11`)}
              />
            </Field>
          </div>
          <div className={cx(`${block} flex flex-col`)}>
            <ToggleRow label="Pickup" checked={form.acceptsPickup} onChange={(value) => update("acceptsPickup", value)} />
            <ToggleRow label="Delivery" checked={form.acceptsDelivery} onChange={(value) => update("acceptsDelivery", value)} />
            <ToggleRow
              label="Menu visible to customers"
              hint={form.isPublished ? "Live at your public link" : "Hidden: the link shows “not found”"}
              checked={form.isPublished}
              onChange={(value) => update("isPublished", value)}
            />
          </div>
          {form.acceptsDelivery && (
            <HoursRow label="Delivery hours" summary={summary(form.deliveryHours)} onOpen={() => setEditingHours("deliveryHours")} />
          )}
          <div className="px-5 py-4 lg:hidden">
            <button type="submit" formAction={signOut} formNoValidate className="min-h-11 text-sm font-semibold underline underline-offset-2">
              Sign out
            </button>
          </div>
        </div>
      </div>

      <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 border-t border-admin-divider bg-admin-bg px-5 py-3 lg:static lg:mt-6 lg:border-0 lg:px-0 lg:py-0">
        <ErrorText error={error} className="mb-2" />
        {saved && !error && (
          <p role="status" className="mb-2 text-sm font-semibold text-ewedu">
            Saved. Your menu is updated.
          </p>
        )}
        <div className="lg:hidden">{saveButton("w-full")}</div>
      </div>

      {editingHours && (
        <BottomSheet
          title={editingHours === "openingHours" ? "Opening hours" : "Delivery hours"}
          onClose={() => setEditingHours(null)}
          footer={(close) => (
            <button type="button" onClick={close} className={cx(`${btnPrimary} flex-1`)}>
              Done
            </button>
          )}
        >
          {() => (
            <>
              <HoursEditor value={form[editingHours]} onChange={(value) => update(editingHours, value)} variant="compact" />
              <p className="mt-3 text-xs text-admin-muted">Tap “Save changes” afterwards to update your menu.</p>
            </>
          )}
        </BottomSheet>
      )}
    </form>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className={cx(`border-b border-admin-divider pb-2 font-extrabold lg:text-[13px] ${sectionLabel}`)}>{children}</h2>;
}

function HoursRow({ label, summary, onOpen }: { label: string; summary: string; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="grid min-h-16 w-full grid-cols-[minmax(0,1fr)_auto] items-center border-b border-admin-divider px-5 py-2 text-left lg:hidden"
    >
      <span className="flex flex-col">
        <span className="text-[15px] font-extrabold">{label}</span>
        <span className="text-[13px] text-admin-muted">{summary}</span>
      </span>
      <span aria-hidden className="text-accent">
        →
      </span>
    </button>
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
        <p className="text-[15px] font-extrabold lg:text-sm">{label}</p>
        {hint && <p className="text-[13px] text-admin-muted lg:text-xs">{hint}</p>}
      </div>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  );
}

/** The logo saves on its own, straight after upload: it doesn't wait for "Save changes". */
function LogoField({ restaurantId, name, logoUrl }: { restaurantId: string; name: string; logoUrl: string | null }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const remove = useSave();

  const upload = async (file: File) => {
    setUploading(true);
    setError(null);
    try {
      const result = await setLogo(await uploadPhoto(restaurantId, "logo", file));
      if ("error" in result) setError(result.error);
    } catch (caught) {
      console.error(caught);
      setError("Couldn’t upload that logo. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3">
      <LogoTile name={name} logoUrl={logoUrl} size={56} />
      <span className="flex flex-col">
        <span className="text-[15px] font-extrabold lg:text-sm">Logo</span>
        <span className="text-[13px] text-admin-muted lg:text-xs">Square, at least 512 px</span>
        {logoUrl && (
          <button
            type="button"
            disabled={remove.pending}
            onClick={() => remove.save(() => setLogo(null))}
            className="self-start text-[13px] font-extrabold text-accent"
          >
            Remove
          </button>
        )}
      </span>
      <label className={cx(`${btnSecondary} min-h-11 cursor-pointer has-focus-visible:outline-2 has-focus-visible:outline-accent lg:min-h-10`)}>
        {uploading ? "Uploading…" : "Upload"}
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file);
            event.target.value = "";
          }}
        />
      </label>
      <ErrorText error={error ?? remove.error} className="col-span-3" />
    </div>
  );
}
