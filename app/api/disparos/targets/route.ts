import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { requireContext } from "@/lib/tenant";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireContext();
    const url = new URL(req.url);
    const tag = url.searchParams.get("tag");

    if (!tag) {
      return NextResponse.json({ error: "Missing tag parameter" }, { status: 400 });
    }

    const supabase = createServiceClient();

    // Query leads belonging to this tenant, matching the selected tag
    const { data: leads, error } = await supabase
      .from("leads")
      .select("id, name, phone")
      .eq("tenant_id", ctx.tenantId)
      .contains("tags", [tag]);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Filter leads that have a phone number
    const targets = (leads ?? []).filter((l) => !!l.phone);

    return NextResponse.json({ leads: targets });
  } catch (err) {
    console.error("[disparos-targets-api] Error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
