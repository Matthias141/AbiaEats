"use client";

import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, icon, id, ...props }, ref) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-600 mb-1.5"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {icon}
            </div>
          )}
          <input
            {...props}
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : props["aria-invalid"]}
            aria-describedby={
              [props["aria-describedby"], error ? errorId : null]
                .filter(Boolean)
                .join(" ") || undefined
            }
            className={cn(
              "w-full min-h-[44px] px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 transition-colors focus:border-brand-orange focus:ring-2 focus:ring-brand-orange-dark focus:bg-white",
              icon && "pl-10",
              error &&
                "border-red-500 focus:border-red-500 focus:ring-red-500/50",
              className,
            )}
          />
        </div>
        {error && (
          <p id={errorId} role="alert" className="mt-1 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export { Input };
