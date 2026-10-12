import type { SVGProps } from "react";
import { cn } from "@/lib/utils";

export type FeatureIconName = "meal" | "payment" | "delivery";

interface FeatureIconProps extends SVGProps<SVGSVGElement> {
  name: FeatureIconName;
}

/** Bespoke Abia Eats illustrations with one shared rounded-line visual language. */
export function FeatureIcon({ name, className, ...props }: FeatureIconProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("size-24", className)}
      aria-hidden="true"
      {...props}
    >
      <circle cx="48" cy="48" r="45" fill="currentColor" opacity="0.08" />
      <circle cx="48" cy="48" r="34" fill="white" opacity="0.72" />
      {name === "meal" && <MealArtwork />}
      {name === "payment" && <PaymentArtwork />}
      {name === "delivery" && <DeliveryArtwork />}
    </svg>
  );
}

function MealArtwork() {
  return (
    <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M28 50h40c-1.7 13-8.4 20-20 20S29.7 63 28 50Z" />
      <path d="M25 50h46M40 70h16" />
      <path d="M36 42c0-4 4-4 4-8s-4-4-4-8M48 42c0-4 4-4 4-8s-4-4-4-8M60 42c0-4 4-4 4-8" />
    </g>
  );
}

function PaymentArtwork() {
  return (
    <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <rect x="24" y="30" width="48" height="34" rx="7" />
      <path d="M24 41h48M32 55h11" />
      <circle cx="62" cy="57" r="10" fill="white" />
      <path d="m57.5 57 3 3 5.5-6" />
    </g>
  );
}

function DeliveryArtwork() {
  return (
    <g stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="34" cy="65" r="7" />
      <circle cx="66" cy="65" r="7" />
      <path d="M41 65h18l8-17H50l-6 10H34M50 48l-5-10h-8" />
      <path d="M61 48V34h12v14M61 39h12M23 48h12M20 55h10" />
    </g>
  );
}
