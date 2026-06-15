import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  const url = request.nextUrl.clone();
  const isLoginRoute = url.pathname.startsWith("/login");
  const isSignupRoute = url.pathname.startsWith("/signup");
  const isAuthRoute = isLoginRoute || isSignupRoute;
  const isPublic =
    isAuthRoute ||
    url.pathname.startsWith("/api/auth/signup") ||
    url.pathname.startsWith("/api/auth/instagram") ||
    url.pathname.startsWith("/api/webhooks") ||
    url.pathname.startsWith("/api/intake") ||
    url.pathname.startsWith("/api/cron") ||
    url.pathname === "/" ||
    url.pathname.startsWith("/privacy") ||
    url.pathname.startsWith("/terms") ||
    url.pathname.startsWith("/_next") ||
    url.pathname.startsWith("/favicon");

  if (!user && !isPublic) {
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return response;
}
