import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { mapSignupError } from "@/lib/auth/signup-errors";

export const dynamic = "force-dynamic";

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const payload = body as {
    email?: string;
    password?: string;
    fullName?: string;
    companyName?: string;
  };

  const email = String(payload.email ?? "")
    .trim()
    .toLowerCase();
  const password = String(payload.password ?? "");
  const fullName = String(payload.fullName ?? "").trim();
  const companyName = String(payload.companyName ?? "").trim();

  if (!companyName) {
    return NextResponse.json({ error: "Informe o nome da empresa." }, { status: 400 });
  }
  if (!fullName) {
    return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  }
  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Informe um email válido." }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "A senha deve ter no mínimo 6 caracteres." }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Servidor sem permissão para criar conta. Contate o suporte." },
      { status: 503 },
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      company_name: companyName,
    },
  });

  if (error) {
    return NextResponse.json({ error: mapSignupError(error.message) }, { status: 400 });
  }

  return NextResponse.json({ ok: true, userId: data.user.id });
}
