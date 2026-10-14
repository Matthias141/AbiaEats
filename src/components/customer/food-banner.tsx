import Image from "next/image";
import type { ReactNode } from "react";

export function FoodBanner({ headingId, eyebrow, title, description, children, compact = false, headingLevel = 1 }: {
  headingId: string;
  eyebrow?: string;
  title: ReactNode;
  description: string;
  children?: ReactNode;
  compact?: boolean;
  headingLevel?: 1 | 2;
}) {
  const Heading = headingLevel === 1 ? "h1" : "h2";
  if (compact) return (
    <section aria-labelledby={headingId}>
      <div className="food-feature">
        <div className="food-feature-media"><Image src="/images/food-banner.webp" alt="Nigerian jollof rice, grilled chicken, plantain, egusi soup and suya" fill priority sizes="(min-width: 1280px) 610px, 55vw" className="food-feature-photo object-cover object-right" /></div>
        <div className="food-feature-copy">
          {eyebrow && <p className="food-feature-eyebrow">{eyebrow}</p>}
          <Heading id={headingId}>{title}</Heading>
          <p className="food-feature-description">{description}</p>
        </div>
      </div>
      {children && <div className="mt-5 min-w-0">{children}</div>}
    </section>
  );
  return (
    <section aria-labelledby={headingId} className="landing-feature grid items-center gap-7 lg:grid-cols-[1fr_1.15fr] lg:gap-12">
      <div className="flex min-w-0 flex-col justify-center py-4 sm:py-6">
        {eyebrow && <p className="mb-3 text-sm font-medium text-muted-foreground">{eyebrow}</p>}
        <h1 id={headingId} className="text-[clamp(2.5rem,5vw,4.5rem)] font-semibold leading-[1.02] tracking-[-0.055em] text-foreground">{title}</h1>
        <p className="mt-5 max-w-md text-base leading-relaxed text-muted-foreground">{description}</p>
        {children && <div className="mt-7 min-w-0">{children}</div>}
      </div>
      <div className="landing-feature-image relative aspect-[5/4] min-w-0 overflow-hidden rounded-[2rem] lg:aspect-square">
        <Image src="/images/food-banner.webp" alt="Nigerian jollof rice, grilled chicken, plantain, egusi soup and suya" fill priority sizes="(min-width: 1280px) 580px, (min-width: 1024px) 55vw, 100vw" className="food-photo object-cover object-right" />
      </div>
    </section>
  );
}
