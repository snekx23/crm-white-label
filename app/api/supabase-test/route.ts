import { NextRequest, NextResponse } from "next/server";
import { createSupabaseContext, withSupabase } from "@supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

// Option A: Standard Next.js route handler using `createSupabaseContext` directly
export async function GET(request: NextRequest) {
  const { data: ctx, error } = await createSupabaseContext<Database>(request, {
    auth: "none", // Skip auth verification for public endpoint demo
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  // ctx.supabaseAdmin is an admin client that bypasses RLS
  // ctx.supabase is RLS-scoped
  const { data: leads, error: queryError } = await ctx.supabaseAdmin
    .from("leads")
    .select("id, name, created_at")
    .limit(5);

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 });
  }

  return NextResponse.json({
    message: "Conexão com @supabase/server estabelecida com sucesso!",
    leads,
  });
}

// Option B: Web API handler wrapped with `withSupabase`
// Useful for Cloudflare Workers/Edge Functions export formats
const wrappedFetch = withSupabase<Database>(
  { auth: "none" },
  async (_req, ctx) => {
    const { data: leads } = await ctx.supabaseAdmin
      .from("leads")
      .select("id, name")
      .limit(3);
    return Response.json({ wrapped: true, leads });
  }
);

// We can expose the wrapped fetch handler under POST method for demonstration
export async function POST(request: Request) {
  return wrappedFetch(request);
}
