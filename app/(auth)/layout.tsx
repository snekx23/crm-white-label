import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandLogo } from "@/components/app/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative grid min-h-screen lg:grid-cols-2">
      {/* Left side - form */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="mb-8 flex justify-center lg:hidden">
              <BrandLogo />
            </div>
            {children}
          </div>
        </div>
        <div className="p-6 text-center text-xs text-muted-foreground">
          © 2026 SolAIre W+ · IA e rebranding para empresas
        </div>
      </div>

      {/* Right side - visual */}
      <div className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/90" />
        <div className="absolute inset-0 grid-pattern opacity-[0.06]" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-brand/10 blur-[120px] dark:bg-brand/30" />
        <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-brand/8 blur-[120px] dark:bg-brand/20" />

        <div className="relative flex h-full flex-col justify-between p-12 text-background">
          <div className="inline-flex items-center gap-2.5 self-start">
            <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background/10 ring-1 ring-background/20 backdrop-blur">
              <span className="font-display font-bold tracking-tightest">S</span>
              <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-brand text-[10px] font-bold leading-none text-brand-foreground">+</span>
            </div>
            <div className="flex flex-col leading-none">
              <span className="font-display text-base font-semibold tracking-tight">
                SolAIre <span className="text-brand">W+</span>
              </span>
              <span className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-background/60">CRM</span>
            </div>
          </div>

          <div>
            <blockquote className="font-display text-3xl font-medium leading-tight tracking-tight">
              &ldquo;Transformamos empresas com IA aplicada, rebranding estrategico e produtos inteligentes sob medida.&rdquo;
            </blockquote>
            <p className="mt-6 text-sm text-background/60">
              SolAIre W+ — Consultoria em IA · Identidade · Produtos digitais
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs">
            <div>
              <div className="font-display text-2xl font-semibold">Demo</div>
              <div className="text-background/60">Pronto pro cliente</div>
            </div>
            <div>
              <div className="font-display text-2xl font-semibold">WL</div>
              <div className="text-background/60">White-label</div>
            </div>
            <div>
              <div className="font-display text-2xl font-semibold">IA</div>
              <div className="text-background/60">No core</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
