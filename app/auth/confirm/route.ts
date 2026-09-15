import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";

/**
 * The link in the login email. It carries a token hash rather than a PKCE code, so it works even
 * when the mail app opens it in a different browser from the one that asked for the email.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  if (tokenHash && type) {
    const supabase = await createServerSupabase();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) redirect("/admin");
    console.error(error);
  }
  redirect("/admin/login?error=link");
}
