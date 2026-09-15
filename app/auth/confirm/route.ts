import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/** Where the email link lands after logging in: an /admin path from `next`, never another site. */
function safeNext(next: string | null): string {
  return next && /^\/admin(?:[/?]|$)/.test(next) ? next : "/admin";
}

/**
 * The link in the login emails (supabase/templates). It carries a token hash rather than a PKCE
 * code, so it works even when the mail app opens it in a different browser from the one that
 * asked for the email.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect(safeNext(searchParams.get("next")));
    console.error(error);
  }
  redirect("/admin/login?error=link");
}
