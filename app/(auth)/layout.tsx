import { ThemeToggle } from "@/components/theme-toggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative grid min-h-screen lg:grid-cols-[minmax(520px,0.86fr)_1.14fr]"
      style={{ "--brand": "36 33% 48%", "--brand-foreground": "0 0% 100%" } as React.CSSProperties}
    >
      <div className="flex flex-col">
        <div className="flex items-center justify-end p-6">
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-sm">
            <div className="mb-10 flex items-center gap-3 lg:hidden">
              <div className="grid h-12 w-12 place-items-center rounded-md border border-brand/30 bg-brand/10 font-display text-sm font-semibold text-brand">
                MP
              </div>
              <div>
                <p className="font-display text-xl font-semibold">Megas Perini</p>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">CRM interno</p>
              </div>
            </div>
            {children}
          </div>
        </div>
        <div className="p-6 text-center text-xs text-muted-foreground">
          © 2026 Megas Perini · CRM interno
        </div>
      </div>

      <div className="relative hidden overflow-hidden bg-[#f2eee8] lg:block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/megas-perini-monogram.png" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/10" />

        <div className="relative flex h-full flex-col justify-between p-12 text-[#211d19]">
          <div>
            <p className="font-display text-3xl font-semibold">Megas Perini</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#675b4e]">CRM interno</p>
          </div>
          <div className="max-w-xl border-l-2 border-[#9d7e52] pl-5">
            <p className="font-display text-4xl font-medium leading-tight">Atendimento, agenda e relacionamento em um só lugar.</p>
            <p className="mt-4 text-sm text-[#675b4e]">Operacao exclusiva da equipe Megas Perini.</p>
          </div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#675b4e]">Referencia em Mega Hair</p>
        </div>
      </div>
    </div>
  );
}
