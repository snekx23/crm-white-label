import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
  /** Logo customizado do tenant (sobrescreve o icone padrao) */
  tenantLogoUrl?: string | null;
  tenantName?: string;
  tagline?: string | null;
}

const dims = {
  sm: { box: "h-7 w-7", icon: 18, text: "text-sm", sub: "text-[9px]" },
  md: { box: "h-9 w-9", icon: 22, text: "text-base", sub: "text-[10px]" },
  lg: { box: "h-12 w-12", icon: 30, text: "text-xl", sub: "text-xs" },
  xl: { box: "h-16 w-16", icon: 40, text: "text-2xl", sub: "text-xs" },
};

export function BrandLogo({
  className,
  showText = true,
  size = "md",
  tenantLogoUrl,
  tenantName,
  tagline,
}: BrandLogoProps) {
  const d = dims[size];

  return (
    <div className={cn("inline-flex items-center gap-2.5", className)}>
      <div
        className={cn(
          "relative grid shrink-0 place-items-center overflow-hidden rounded-lg",
          d.box,
          tenantLogoUrl
            ? "bg-card ring-1 ring-border/70"
            : "bg-primary text-primary-foreground shadow-[0_18px_42px_hsl(var(--brand)/0.16)] ring-1 ring-brand/30",
        )}
      >
        {tenantLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={tenantLogoUrl} alt={tenantName ?? "Logo"} className="h-full w-full object-cover" />
        ) : (
          <SunWMark size={d.icon} />
        )}
      </div>
      {showText && (
        <div className="flex flex-col leading-none">
          <span className={cn("font-display font-semibold tracking-tight", d.text)}>
            {tenantName ?? (
              <>
                SolAIre <span className="text-brand">W+</span>
              </>
            )}
          </span>
          <span className={cn("mt-1 font-medium uppercase tracking-[0.2em] text-muted-foreground", d.sub)}>
            {tenantName ? (tagline?.trim() || "CRM") : "CRM"}
          </span>
        </div>
      )}
    </div>
  );
}

function SunWMark({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="sw-grad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="hsl(var(--brand))" />
          <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      <path d="M6.5 9.5c2.5-2.5 7.2-3.6 11.1-1.8l-1.5 3.2c-2.4-1-5.2-.6-6.8 1-1.1 1.1-.9 2.4.8 3l4.8 1.6c4.3 1.4 6 4.9 3.3 7.8-2.7 2.9-8.2 3.5-12.2 1.1l1.7-3.1c2.7 1.5 6 1.3 7.6-.3 1.1-1.1.8-2.4-1-3l-4.6-1.5c-4.2-1.4-5.9-4.9-3.2-8Z" fill="currentColor" />
      <path d="M20.4 25 24 7h3.5l-3.6 18h-3.5Z" fill="url(#sw-grad)" />
      <path d="M27.8 17.4v5.2h-2.3v-5.2h2.3Zm-3.8 1.5h5.2v2.3H24v-2.3Z" fill="hsl(var(--aqua))" />
    </svg>
  );
}
