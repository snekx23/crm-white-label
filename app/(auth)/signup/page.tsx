"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Building2, Loader2, Lock, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { mapSignupError } from "@/lib/auth/signup-errors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";

const STEPS = [
  {
    id: "company",
    label: "Empresa",
    icon: Building2,
    title: "Qual é sua empresa?",
    description: "Comece pelo nome que seus clientes vão reconhecer.",
  },
  {
    id: "profile",
    label: "Perfil",
    icon: User,
    title: "Seus dados",
    description: "Como podemos te chamar e qual email usar no CRM.",
  },
  {
    id: "security",
    label: "Acesso",
    icon: Lock,
    title: "Proteja sua conta",
    description: "Escolha uma senha segura para entrar quando quiser.",
  },
] as const;

const TOTAL_STEPS = STEPS.length;

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearingSession, setClearingSession] = useState(true);

  const current = STEPS[step];
  const progress = ((step + 1) / TOTAL_STEPS) * 100;
  const isLastStep = step === TOTAL_STEPS - 1;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) await supabase.auth.signOut();
      setClearingSession(false);
    });
  }, []);

  function goToStep(next: number) {
    setDirection(next > step ? 1 : -1);
    setError(null);
    setStep(next);
  }

  function validateStep(): string | null {
    if (step === 0 && !companyName.trim()) {
      return "Informe o nome da empresa.";
    }
    if (step === 1) {
      if (!fullName.trim()) return "Informe seu nome.";
      if (!isValidEmail(email)) return "Informe um email válido.";
    }
    if (step === 2 && password.length < 6) {
      return "A senha deve ter no mínimo 6 caracteres.";
    }
    return null;
  }

  function handleBack() {
    if (step > 0) goToStep(step - 1);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const validationError = validateStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!isLastStep) {
      goToStep(step + 1);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          fullName: fullName.trim(),
          companyName: companyName.trim(),
        }),
      });

      const payload = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(payload.error ?? "Não foi possível criar a conta.");
        return;
      }

      const supabase = createClient();
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (loginError) {
        setError(
          mapSignupError(loginError.message) +
            " A conta foi criada — tente entrar na página de login.",
        );
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Erro de conexão. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (clearingSession) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 space-y-5">
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Passo {step + 1} de {TOTAL_STEPS}
            </p>
            <p className="text-xs text-muted-foreground">{Math.round(progress)}%</p>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ol className="flex items-center justify-between gap-2">
            {STEPS.map((item, index) => {
              const Icon = item.icon;
              const isActive = index === step;
              const isComplete = index < step;
              return (
                <li key={item.id} className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full border transition-colors duration-150",
                      isActive && "border-brand bg-brand text-brand-foreground shadow-[var(--shadow-brand)]",
                      isComplete && "border-brand/50 bg-brand/15 text-brand",
                      !isActive && !isComplete && "border-border bg-muted/40 text-muted-foreground",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span
                    className={cn(
                      "truncate text-[10px] font-medium uppercase tracking-wide",
                      isActive ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {item.label}
                  </span>
                </li>
              );
            })}
          </ol>
        </div>

        <div
          key={`heading-${step}-${direction}`}
          className={cn(
            "space-y-2 animate-fade-in-up",
            direction === -1 && "[animation-direction:reverse]",
          )}
        >
          <h1 className="font-display text-3xl font-semibold tracking-tight">{current.title}</h1>
          <p className="text-sm text-muted-foreground">{current.description}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <div
          key={`fields-${step}-${direction}`}
          className={cn(
            "space-y-4 animate-fade-in-up [animation-delay:60ms] [animation-fill-mode:both]",
            direction === -1 && "[animation-direction:reverse]",
          )}
        >
          {step === 0 && (
            <div className="space-y-2">
              <Label htmlFor="company">Nome da empresa</Label>
              <Input
                id="company"
                autoFocus
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Sua Empresa LTDA"
              />
            </div>
          )}

          {step === 1 && (
            <>
              <div className="space-y-2">
                <Label htmlFor="full-name">Seu nome</Label>
                <Input
                  id="full-name"
                  autoFocus
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Joao da Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@empresa.com"
                />
              </div>
            </>
          )}

          {step === 2 && (
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <PasswordInput
                id="password"
                autoFocus
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
              <p className="text-xs text-muted-foreground">
                Use pelo menos 6 caracteres. Voce podera alterar depois nas configuracoes.
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive animate-fade-in-up">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Criando...
              </>
            ) : isLastStep ? (
              "Criar conta"
            ) : (
              <>
                Continuar
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>

          {step > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="w-full text-muted-foreground"
              onClick={handleBack}
              disabled={loading}
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
        </div>

        {step === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            Ja tem conta?{" "}
            <Link href="/login" className="font-medium text-foreground hover:text-brand">
              Entrar
            </Link>
          </p>
        )}
      </form>
    </div>
  );
}
