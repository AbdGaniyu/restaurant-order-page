import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

/**
 * Admin only (see matcher): refreshes the owner's session cookies before the page renders, and
 * sends signed-out visitors to the login page. This is the optimistic check; every admin page and
 * server action verifies the session again (lib/admin/session.ts), and RLS guards the data.
 * Public menu routes never pass through here, so they stay static.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims.sub);
  const path = request.nextUrl.pathname;

  // Carry any refreshed session cookies onto the redirect.
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (path === "/admin/login") return signedIn ? redirectTo("/admin") : response;
  if (!signedIn) return redirectTo("/admin/login");
  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
