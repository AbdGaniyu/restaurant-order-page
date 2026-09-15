"use client";

import { useState, useTransition, type FormEvent } from "react";
import { sendLoginCode, verifyLoginCode } from "@/app/admin/login/actions";
import { ErrorText, inputClass, primaryButton } from "./controls";

/** Email → 6-digit code. The code is typed in, so login works even if the email opens in another app. */
export function LoginForm({ linkFailed }: { linkFailed: boolean }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [error, setError] = useState<string | null>(
    linkFailed ? "That login link has expired or was already used. Send a new code." : null,
  );
  const [pending, startTransition] = useTransition();

  const send = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await sendLoginCode(email);
      setError(result.error ?? null);
      if (!result.error) setStep("code");
    });
  };

  const verify = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      // Success redirects to /admin; only failures come back.
      const result = await verifyLoginCode(email, code);
      setError(result.error ?? null);
    });
  };

  if (step === "code") {
    return (
      <form onSubmit={verify} className="mt-8 space-y-4" noValidate>
        <p>
          We sent a code to <strong>{email}</strong>. Enter it below, or tap the link in the email.
        </p>
        <label className="block">
          <span className="font-bold">6-digit code</span>
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            autoFocus
            value={code}
            onChange={(event) => setCode(event.target.value)}
            aria-invalid={Boolean(error)}
            className={`${inputClass} mt-2 text-center text-2xl tracking-[0.4em] tabular-nums`}
          />
        </label>
        <ErrorText error={error} />
        <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
          {pending ? "Checking…" : "Log in"}
        </button>
        <button
          type="button"
          onClick={() => {
            setStep("email");
            setCode("");
            setError(null);
          }}
          className="w-full py-3 text-sm font-bold underline underline-offset-2"
        >
          Use a different email or send a new code
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={send} className="mt-8 space-y-4" noValidate>
      <label className="block">
        <span className="font-bold">Email</span>
        <input
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={Boolean(error)}
          className={`${inputClass} mt-2`}
        />
      </label>
      <ErrorText error={error} />
      <button type="submit" disabled={pending} className={`${primaryButton} w-full`}>
        {pending ? "Sending…" : "Email me a login code"}
      </button>
      <p className="text-sm text-muted">New here? The same code sets up your restaurant.</p>
    </form>
  );
}
