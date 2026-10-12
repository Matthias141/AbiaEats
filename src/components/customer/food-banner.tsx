import Image from "next/image";
import type { ReactNode } from "react";

export function FoodBanner({ headingId, eyebrow, title, description, children, compact = false }: {
  headingId: string;
  eyebrow?: string;
  title: ReactNode;
  description: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  if (compact) return (
    <section aria-labelledby={headingId}>
      <div className="food-feature">
        <Image src="/images/food-banner.webp" alt="Nigerian jollof rice, grilled chicken, plantain, egusi soup and suya" fill priority sizes="(min-width: 1280px) 1104px, 100vw" className="object-cover object-[70%_65%]" />
        <div className="food-feature-scrim" />
        <div className="food-feature-copy">
          {eyebrow && <p className="mb-3 text-xs font-medium text-muted-foreground sm:text-sm">{eyebrow}</p>}
          <h1 id={headingId} className="font-brand text-[clamp(1.75rem,4vw,3rem)] font-medium leading-[1.12] tracking-tight text-foreground">{title}</h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </div>
      {children && <div className="mt-5 min-w-0">{children}</div>}
    </section>
  );
  return (
    <section aria-labelledby={headingId} className="grid items-center gap-7 lg:grid-cols-[1.1fr_1fr] lg:gap-12">
      <div className="flex min-w-0 flex-col justify-center py-4 sm:py-6">
        {eyebrow && <p className="mb-3 text-sm font-medium text-muted-foreground">{eyebrow}</p>}
        <h1 id={headingId} className="font-brand text-[clamp(2rem,5vw,4rem)] font-medium leading-[1.08] tracking-tight text-foreground">{title}</h1>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
        {children && <div className="mt-6 min-w-0">{children}</div>}
      </div>
      <div className="beautiful-md relative aspect-[16/10] min-w-0 overflow-hidden rounded-[1.75rem] lg:aspect-square">
        <Image src="/images/food-banner.webp" alt="Nigerian jollof rice, grilled chicken, plantain, egusi soup and suya" fill priority sizes="(min-width: 1280px) 550px, (min-width: 1024px) 50vw, 100vw" className="food-photo object-cover object-right" />
      </div>
    </section>
  );
}
