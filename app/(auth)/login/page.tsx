"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { mapSignupError } from "@/lib/auth/signup-errors";

export default function LoginPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"admin" | "vendedor">("admin");
  const [email, setEmail] = useState("choppaosuperbanda@gmail.com");
  const [password, setPassword] = useState("choppao123@");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function selectTab(tab: "admin" | "vendedor") {
    setActiveTab(tab);
    setError(null);
    if (tab === "admin") {
      setEmail("choppaosuperbanda@gmail.com");
      setPassword("choppao123@");
    } else {
      setEmail("vendedor@choppao.com");
      setPassword("choppao123@");
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(mapSignupError(error.message));
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-6 space-y-2">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Bem-vindo de volta</h1>
        <p className="text-sm text-muted-foreground">Escolha o seu perfil de acesso para entrar no painel</p>
      </div>

      {/* Tabs Selector */}
      <div className="mb-6 grid w-full grid-cols-2 rounded-lg bg-muted/60 p-1 text-sm text-muted-foreground ring-1 ring-border/50">
        <button
          type="button"
          onClick={() => selectTab("admin")}
          className={`flex items-center justify-center rounded-md py-2 font-medium transition-all ${
            activeTab === "admin"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/20"
              : "hover:text-foreground"
          }`}
        >
          🔑 Admin / CRM
        </button>
        <button
          type="button"
          onClick={() => selectTab("vendedor")}
          className={`flex items-center justify-center rounded-md py-2 font-medium transition-all ${
            activeTab === "vendedor"
              ? "bg-background text-foreground shadow-sm ring-1 ring-border/20"
              : "hover:text-foreground"
          }`}
        >
          👴 Vendedor (Acesso Simples)
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-5">
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
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        <Button type="submit" variant="brand" size="lg" className="w-full" disabled={loading}>
          {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Entrando...</> : "Entrar"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          Nao tem conta?{" "}
          <Link href="/signup" className="font-medium text-foreground hover:text-brand">
            Criar conta gratis
          </Link>
        </p>
      </form>
    </div>
  );
}
