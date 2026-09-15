"use client";

import { useEffect, useState, useTransition, type FormEvent } from "react";
import { sendLoginCode, verifyLoginCode } from "@/app/admin/login/actions";
import { IconMail } from "./icons";
import { cx, btnGhost, btnPrimary, btnSecondary, ErrorText, Field, inputClass, LogoTile } from "./ui";

/** Supabase won't send another email to the same address sooner than this. */
const RESEND_SECONDS = 60;

const heading = "text-[32px] leading-[1.12] font-extrabold";

/**
 * Magic-link sign-in in two states: the email form, then "Check your email" with a resend
 * countdown. The email also carries a 6-digit code, accepted here as a fallback for when the
 * mail app opens the link in its own browser and the session lands there instead.
 */
export function LoginForm({ linkFailed }: { linkFailed: boolean }) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sentAt, setSentAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [error, setError] = useState<string | null>(
    linkFailed ? "That sign-in link has expired or was already used. Send a new one." : null,
  );
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (sentAt === null) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [sentAt]);

  const remaining = sentAt === null ? 0 : Math.max(0, RESEND_SECONDS - Math.floor((now - sentAt) / 1000));

  const send = () =>
    startTransition(async () => {
      const result = await sendLoginCode(email);
      setError(result.error ?? null);
      if (!result.error) {
        const time = Date.now();
        setSentAt(time);
        setNow(time);
      }
    });

  const verify = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      // Success redirects to /admin; only failures come back.
      const result = await verifyLoginCode(email, code);
      setError(result.error ?? null);
    });
  };

  if (sentAt === null) {
    return (
      <form
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        noValidate
        className="flex flex-col gap-6"
      >
        <div className="lg:hidden">
          <LogoTile name="Menu" logoUrl={null} size={44} />
        </div>
        <div>
          <h1 className={heading}>
            <span className="lg:hidden">Sign in to your kitchen</span>
            <span className="hidden lg:inline">Sign in</span>
          </h1>
          <p className="mt-2 text-[15px] text-admin-muted">We&apos;ll email you a link. No password to remember.</p>
        </div>
        <Field label="Email">
          <input
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            aria-invalid={Boolean(error)}
            className={inputClass}
          />
        </Field>
        <ErrorText error={error} />
        <button type="submit" disabled={pending} className={cx(`${btnPrimary} w-full`)}>
          {pending ? "Sending…" : "Email me a link"}
        </button>
        <p className="text-xs text-admin-muted">Links expire in an hour and work once. New here? The same link sets up your restaurant.</p>
      </form>
    );
  }

  const minutes = Math.floor(remaining / 60);
  const seconds = String(remaining % 60).padStart(2, "0");

  return (
    <div className="flex flex-col gap-6">
      <span className="grid size-11 place-items-center border-2 border-accent text-accent">
        <IconMail size={22} />
      </span>
      <div>
        <h1 className={heading}>Check your email</h1>
        <p className="mt-2 text-[15px] text-admin-muted">
          We sent a sign-in link to <strong className="font-extrabold text-admin-text">{email}</strong>. Tap it on this
          phone to continue.
        </p>
      </div>
      <div aria-hidden className="h-0.5 bg-admin-divider" />
      <button type="button" onClick={send} disabled={pending || remaining > 0} className={cx(`${btnSecondary} w-full`)}>
        {remaining > 0 ? `Resend in ${minutes}:${seconds}` : pending ? "Sending…" : "Resend link"}
      </button>

      <form onSubmit={verify} noValidate className="flex flex-col gap-2">
        <Field label="Link opened in another app? Enter the 6-digit code from the email.">
          <input
            name="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            value={code}
            onChange={(event) => setCode(event.target.value)}
            aria-invalid={Boolean(error)}
            className={cx(`${inputClass} tracking-[0.3em] tabular-nums`)}
          />
        </Field>
        <button type="submit" disabled={pending} className={cx(`${btnSecondary} w-full`)}>
          {pending ? "Checking…" : "Sign in with code"}
        </button>
      </form>

      <ErrorText error={error} />
      <button
        type="button"
        onClick={() => {
          setSentAt(null);
          setCode("");
          setError(null);
        }}
        className={cx(`${btnGhost} self-start px-0`)}
      >
        Use a different email
      </button>
    </div>
  );
}
