"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { createRestaurant, setItemPhoto, signOut } from "@/app/admin/actions";
import { uploadPhoto } from "@/lib/admin/upload-photo";
import { normalizeWhatsAppNumber, parseNairaToKobo, parseWeeklyHours } from "@/lib/admin/validation";
import { formatNaira } from "@/lib/format";
import { DEFAULT_HOURS, HoursEditor, type HoursValue } from "./HoursEditor";
import { IconCamera } from "./icons";
import {
  cx,
  btnGhost,
  btnPrimary,
  btnSecondary,
  ErrorText,
  Field,
  inputClass,
  LogoTile,
  PrefixedInput,
  sectionLabel,
  StepProgress,
} from "./ui";

const STEPS = ["Restaurant & WhatsApp", "Opening hours", "First three items"];
const TITLES = ["Tell us about your restaurant", "When are you open?", "Add your first three items"];
const MAX_ITEMS = 10;

interface Row {
  name: string;
  price: string;
  photo: { file: File; preview: string } | null;
}

const emptyRow = (): Row => ({ name: "", price: "", photo: null });

/** "803 555 0192" or "0803…" → "+2348035550192". A number typed with its own country code is kept. */
function fullNumber(typed: string): string {
  const trimmed = typed.trim();
  if (trimmed.startsWith("+")) return trimmed;
  const digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("234") && digits.length === 13) return `+${digits}`;
  return `+234${digits.replace(/^0/, "")}`;
}

/**
 * First login: restaurant name and WhatsApp number, opening hours, first items. Publishing creates
 * the restaurant live; photos picked on step 3 upload right after, once their items exist.
 */
export function Onboarding({ email }: { email: string | null }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState<HoursValue>(DEFAULT_HOURS);
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow()]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const updateRow = (index: number, change: Partial<Row>) =>
    setRows((current) => current.map((row, i) => (i === index ? { ...row, ...change } : row)));

  const pickPhoto = (index: number, file: File) => {
    const previous = rows[index].photo;
    if (previous) URL.revokeObjectURL(previous.preview);
    updateRow(index, { photo: { file, preview: URL.createObjectURL(file) } });
  };

  const next = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (step === 1) {
      if (!name.trim()) return setError("Enter your restaurant’s name");
      if (!normalizeWhatsAppNumber(fullNumber(phone))) return setError("Enter the WhatsApp number, e.g. 803 555 0192");
      return setStep(2);
    }
    if (step === 2) {
      if (!parseWeeklyHours(hours)) return setError("Each open day needs an opening and a closing time");
      return setStep(3);
    }

    const filled = rows.filter((row) => row.name.trim() || row.price.trim());
    if (filled.length === 0) return setError("Add at least one item");
    if (filled.some((row) => !row.name.trim() || parseNairaToKobo(row.price) === null)) {
      return setError("Each item needs a name and a price in whole naira, e.g. 3500");
    }
    startTransition(async () => {
      const result = await createRestaurant({
        name,
        whatsappNumber: fullNumber(phone),
        openingHours: hours,
        items: filled.map((row) => ({ name: row.name, price: row.price })),
      });
      if ("error" in result) {
        setError(result.error);
        return;
      }
      // A photo that fails to upload doesn't undo the menu; it can be added again from Items.
      await Promise.all(
        filled.map(async (row, index) => {
          const itemId = result.itemIds?.[index];
          if (!row.photo || !itemId || !result.id) return;
          try {
            await setItemPhoto(itemId, await uploadPhoto(result.id, itemId, row.photo.file));
          } catch (caught) {
            console.error(caught);
          }
        }),
      );
      router.push("/admin?tab=items&welcome=1");
    });
  };

  const signedIn = (
    <form action={signOut} className="text-xs text-admin-muted">
      Signed in as {email ?? "you"}.{" "}
      <button type="submit" className="min-h-11 font-semibold underline underline-offset-2">
        Sign out
      </button>
    </form>
  );

  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
      <aside className="hidden border-r border-admin-divider p-8 lg:flex lg:flex-col lg:gap-8">
        <div className="flex items-center gap-3">
          <LogoTile name={name || "Your restaurant"} logoUrl={null} size={36} />
          <span className="min-w-0 truncate text-base font-extrabold">{name.trim() || "Your restaurant"}</span>
        </div>
        <ol className="flex flex-col">
          {STEPS.map((label, index) => {
            const number = index + 1;
            const current = number === step;
            const done = number < step;
            return (
              <li
                key={label}
                aria-current={current ? "step" : undefined}
                className={`grid grid-cols-[28px_1fr] gap-3 py-3.5 ${
                  current ? "border-t-2 border-accent" : "border-t border-admin-divider text-admin-muted"
                } ${number === STEPS.length ? "border-b border-b-admin-divider" : ""}`}
              >
                <span className={`text-[13px] font-extrabold ${done || current ? "text-accent" : ""}`}>
                  {done ? "✓" : number}
                </span>
                <span className={current ? "text-sm font-extrabold text-admin-text" : "text-sm"}>{label}</span>
              </li>
            );
          })}
        </ol>
        <div className="mt-auto">{signedIn}</div>
      </aside>

      <form onSubmit={next} noValidate className="flex flex-1 flex-col lg:max-w-[760px] lg:px-16 lg:py-12">
        <div className="px-5 pt-4 lg:hidden">
          <StepProgress step={step} total={STEPS.length} />
        </div>
        <p className={cx(`hidden lg:block ${sectionLabel}`)}>
          Step {step} of {STEPS.length}
        </p>

        <div className="flex flex-1 flex-col gap-5 px-5 pt-6 lg:flex-none lg:gap-6 lg:px-0">
          <div>
            <h1 className="text-[28px] leading-[1.12] font-extrabold lg:text-[36px]">{TITLES[step - 1]}</h1>
            {step === 3 && <p className="mt-1.5 text-sm text-admin-muted">You can add photos and descriptions later.</p>}
          </div>

          {step === 1 && (
            <>
              <Field label="Restaurant name">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="e.g. Mama Put Kitchen"
                  className={inputClass}
                />
              </Field>
              <Field label="WhatsApp number" hint="Orders arrive as WhatsApp messages here.">
                <PrefixedInput
                  prefix="+234"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="803 555 0192"
                />
              </Field>
            </>
          )}

          {step === 2 && (
            <>
              <div className="lg:hidden">
                <HoursEditor value={hours} onChange={setHours} variant="compact" />
              </div>
              <div className="hidden lg:block">
                <HoursEditor value={hours} onChange={setHours} variant="full" />
              </div>
            </>
          )}

          {step === 3 && (
            <div className="flex flex-col">
              <ul className="border-t border-admin-divider">
                {rows.map((row, index) => (
                  <li
                    key={index}
                    className="grid grid-cols-[56px_minmax(0,1fr)_96px] items-center gap-3 border-b border-admin-divider py-2.5"
                  >
                    <label className="relative grid size-14 cursor-pointer place-items-center overflow-hidden rounded-[10px] border border-dashed border-admin-neutral-400 bg-white text-admin-muted has-focus-visible:outline-2 has-focus-visible:outline-accent">
                      {row.photo ? (
                        <Image src={row.photo.preview} alt="" fill sizes="56px" unoptimized className="object-cover" />
                      ) : (
                        <IconCamera size={20} />
                      )}
                      <span className="sr-only">
                        {row.photo ? "Change" : "Add"} photo for item {index + 1}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) pickPhoto(index, file);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <input
                      aria-label={`Item ${index + 1} name`}
                      placeholder="Item name"
                      value={row.name}
                      onChange={(event) => updateRow(index, { name: event.target.value })}
                      className={cx(`${inputClass} min-h-11 text-[15px]`)}
                    />
                    <input
                      aria-label={`Item ${index + 1} price in naira`}
                      inputMode="numeric"
                      placeholder="₦0"
                      value={row.price}
                      onChange={(event) => updateRow(index, { price: event.target.value })}
                      onBlur={() => {
                        const kobo = parseNairaToKobo(row.price);
                        if (kobo !== null && row.price.trim()) updateRow(index, { price: formatNaira(kobo / 100) });
                      }}
                      className={cx(`${inputClass} min-h-11 text-right text-[15px]`)}
                    />
                  </li>
                ))}
              </ul>
              {rows.length < MAX_ITEMS && (
                <button
                  type="button"
                  onClick={() => setRows((current) => [...current, emptyRow()])}
                  className={cx(`${btnGhost} mt-2 self-start px-0`)}
                >
                  + Add another
                </button>
              )}
            </div>
          )}

          <ErrorText error={error} />
        </div>

        <div className="sticky bottom-0 flex gap-2 border-t border-admin-divider bg-admin-bg px-5 pt-4 pb-[max(2rem,env(safe-area-inset-bottom))] lg:static lg:border-0 lg:px-0 lg:pt-8 lg:pb-0">
          {step > 1 && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setStep(step - 1);
              }}
              className={cx(`${btnSecondary} w-24 lg:w-[120px]`)}
            >
              Back
            </button>
          )}
          <button type="submit" disabled={pending} className={cx(`${btnPrimary} flex-1 lg:w-[220px] lg:flex-none`)}>
            {step < STEPS.length ? "Continue" : pending ? "Publishing…" : "Publish menu"}
          </button>
        </div>
        <div className="px-5 pb-6 lg:hidden">{signedIn}</div>
      </form>
    </div>
  );
}
