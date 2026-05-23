import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
  backHref?: string;
}

export function PageHeader({ title, description, eyebrow, actions, className, backHref }: PageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-4 border-b border-border/40 bg-background/30 px-8 py-7 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="space-y-1">
        {backHref && (
          <Link
            href={backHref}
            prefetch
            className="mb-1 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar
          </Link>
        )}
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand">{eyebrow}</p>
        )}
        <h1 className="font-display text-2xl font-semibold tracking-normal md:text-3xl">{title}</h1>
        {description && (
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
