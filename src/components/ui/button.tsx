"use client";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { Button as PrimitiveButton } from "@/components/ui/primitives/button";
import { Spinner } from "@/components/ui/primitives/spinner";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}
/** Existing callers retain their API; controls render the installed shadcn primitive. */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", isLoading, disabled, children, ...props }, ref) => (
    <PrimitiveButton {...props} ref={ref}
      variant={variant === "primary" ? "default" : variant === "danger" ? "destructive" : variant}
      size={size === "md" ? "default" : size} disabled={disabled || isLoading} aria-busy={isLoading || undefined}>
      {isLoading && <Spinner data-icon="inline-start" aria-hidden="true" />}
      {children}
    </PrimitiveButton>
  ),
);
Button.displayName = "Button";
