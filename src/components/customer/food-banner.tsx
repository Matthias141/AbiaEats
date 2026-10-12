import Image from "next/image";
import type { ReactNode } from "react";

export function FoodBanner({ headingId, eyebrow, title, description, children }: {
  headingId: string;
  eyebrow?: string;
  title: ReactNode;
  description: string;
  children?: ReactNode;
}) {
  return (
    <section aria-labelledby={headingId} className="beautiful-md grid overflow-hidden rounded-3xl bg-[#f6ecdf] lg:grid-cols-[1.1fr_1fr]">
      <div className="flex min-w-0 flex-col justify-center p-5 sm:p-8 lg:p-10">
        {eyebrow && <p className="mb-3 text-sm font-medium text-muted-foreground">{eyebrow}</p>}
        <h1 id={headingId} className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">{title}</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">{description}</p>
        {children && <div className="mt-5 min-w-0">{children}</div>}
      </div>
      <div className="relative aspect-[2/1] min-w-0 lg:aspect-auto lg:min-h-[20rem]">
        <Image src="/images/food-banner.webp" alt="Nigerian jollof rice, grilled chicken, plantain, egusi soup and suya" fill priority sizes="(min-width: 1280px) 550px, (min-width: 1024px) 50vw, 100vw" className="food-photo object-cover object-right" />
      </div>
    </section>
  );
}
