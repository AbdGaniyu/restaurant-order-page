"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Emails a 6-digit code (and a link) to the owner. New emails get an account, which onboarding then fills in. */
export async function sendLoginCode(email: string): Promise<{ error?: string }> {
  const address = email.trim().toLowerCase();
  if (!EMAIL.test(address)) return { error: "Enter your email address" };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
  if (error) {
    console.error(error);
    return {
      error: error.status === 429 ? "Too many attempts. Wait a minute, then try again." : "Couldn’t send the email. Try again.",
    };
  }
  return {};
}

export async function verifyLoginCode(email: string, code: string): Promise<{ error?: string }> {
  const token = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(token)) return { error: "Enter the 6-digit code from the email" };

  const supabase = await createServerSupabase();
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token, type: "email" });
  if (error) return { error: "That code didn’t work. Check it, or send a new one." };
  redirect("/admin");
}
