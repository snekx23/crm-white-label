import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

export async function updateSession(request: NextRequest) {
  const url = request.nextUrl.clone();
  console.log(`[middleware] Request path: ${url.pathname}`);
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

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
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError) {
    console.error("[middleware] getUser error:", userError);
  }
  
  console.log(`[middleware] User authenticated: ${user ? `${user.email} (${user.id})` : "no"}`);

  const isLoginRoute = url.pathname.startsWith("/login");
  const isSignupRoute = url.pathname.startsWith("/signup");
  const isAuthRoute = isLoginRoute || isSignupRoute;
  const isPublic =
    isAuthRoute ||
    url.pathname.startsWith("/forms/") ||
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
    console.log(`[middleware] User not authenticated on protected route, redirecting to /login`);
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthRoute) {
    console.log(`[middleware] Authenticated user on auth route, redirecting to /dashboard`);
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  console.log(`[middleware] Allowing request to proceed: ${url.pathname}`);
  return response;
}
