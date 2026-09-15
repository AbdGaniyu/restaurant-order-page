"use client";

import { useState, useTransition, type FormEvent } from "react";
import { createRestaurant, signOut } from "@/app/admin/actions";
import { normalizeWhatsAppNumber, parseNairaToKobo } from "@/lib/admin/validation";
import { ErrorText, inputClass, primaryButton, secondaryButton } from "./controls";

const STEPS = ["Your restaurant", "WhatsApp number", "First items"] as const;
const EMPTY_ITEMS = [0, 1, 2].map(() => ({ name: "", price: "" }));

/** First login: three short steps, then the restaurant is live with those items. */
export function Onboarding({ email }: { email: string | null }) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [items, setItems] = useState(EMPTY_ITEMS);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const next = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    if (step === 0 && !name.trim()) return setError("Enter your restaurant’s name");
    if (step === 1 && !normalizeWhatsAppNumber(whatsappNumber)) {
      return setError("Enter the number with its country code, e.g. +234 803 123 4567");
    }
    if (step < 2) return setStep(step + 1);

    const filled = items.filter((item) => item.name.trim() || item.price.trim());
    if (filled.length === 0) return setError("Add at least one item");
    if (filled.some((item) => !item.name.trim() || parseNairaToKobo(item.price) === null)) {
      return setError("Each item needs a name and a price in whole naira, e.g. 1500");
    }
    startTransition(async () => {
      // Success redirects into the admin; only failures come back.
      const result = await createRestaurant({ name, whatsappNumber, items });
      if ("error" in result) setError(result.error);
    });
  };

  const updateItem = (index: number, field: "name" | "price", value: string) =>
    setItems((current) => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <p className="text-sm font-bold text-muted">
        Step {step + 1} of {STEPS.length}
      </p>
      <h1 className="mt-1 font-display text-3xl">{STEPS[step]}</h1>
      <ol aria-hidden className="mt-4 grid grid-cols-3 gap-2">
        {STEPS.map((label, index) => (
          <li key={label} className={`h-1.5 rounded-full ${index <= step ? "bg-ink" : "bg-line"}`} />
        ))}
      </ol>

      <form onSubmit={next} noValidate className="mt-8 space-y-5">
        {step === 0 && (
          <label className="block">
            <span className="font-bold">Restaurant name</span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Mama Put Kitchen"
              className={`${inputClass} mt-2`}
            />
            <span className="mt-2 block text-sm text-muted">Customers see this at the top of your menu.</span>
          </label>
        )}

        {step === 1 && (
          <label className="block">
            <span className="font-bold">WhatsApp number for orders</span>
            <input
              autoFocus
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={whatsappNumber}
              onChange={(event) => setWhatsappNumber(event.target.value)}
              placeholder="0803 123 4567"
              className={`${inputClass} mt-2`}
            />
            <span className="mt-2 block text-sm text-muted">
              Orders arrive here as WhatsApp messages. Nigerian numbers can start with 0.
            </span>
          </label>
        )}

        {step === 2 && (
          <fieldset className="space-y-4">
            <legend className="text-sm text-muted">
              Add up to three to start; you can add the rest, photos and categories next.
            </legend>
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-[1fr_7rem] gap-2">
                <input
                  aria-label={`Item ${index + 1} name`}
                  placeholder={["e.g. Jollof rice", "e.g. Fried plantain", "e.g. Bottled water"][index]}
                  value={item.name}
                  onChange={(event) => updateItem(index, "name", event.target.value)}
                  className={inputClass}
                />
                <label className="flex h-12 items-center rounded-xl border border-line px-3 focus-within:border-ink">
                  <span aria-hidden className="text-muted">
                    ₦
                  </span>
                  <input
                    aria-label={`Item ${index + 1} price in naira`}
                    inputMode="numeric"
                    placeholder="1500"
                    value={item.price}
                    onChange={(event) => updateItem(index, "price", event.target.value)}
                    className="w-full min-w-0 bg-transparent pl-1 outline-none"
                  />
                </label>
              </div>
            ))}
          </fieldset>
        )}

        <ErrorText error={error} />

        <div className="flex gap-3">
          {step > 0 && (
            <button type="button" onClick={() => setStep(step - 1)} className={secondaryButton}>
              Back
            </button>
          )}
          <button type="submit" disabled={pending} className={`${primaryButton} flex-1`}>
            {step < 2 ? "Next" : pending ? "Creating your menu…" : "Create my menu"}
          </button>
        </div>
      </form>

      <form action={signOut} className="mt-10 text-sm text-muted">
        Signed in as {email ?? "you"}.{" "}
        <button type="submit" className="font-bold underline underline-offset-2">
          Sign out
        </button>
      </form>
    </main>
  );
}
