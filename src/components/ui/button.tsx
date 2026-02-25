'use client';

import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'tap-target inline-flex items-center justify-center gap-2 rounded-xl font-body font-medium transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none',
          {
            'gradient-orange text-white shadow-lg shadow-brand-orange/25 hover:shadow-brand-orange/40': variant === 'primary',
            'bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200': variant === 'secondary',
            'text-gray-700 hover:bg-gray-100': variant === 'ghost',
            'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20': variant === 'danger',
            'border border-gray-200 text-gray-700 hover:border-brand-orange hover:text-brand-orange': variant === 'outline',
          },
          {
            'px-3 py-1.5 text-sm min-h-[36px]': size === 'sm',
            'px-5 py-2.5 text-sm min-h-[44px]': size === 'md',
            'px-8 py-3.5 text-base min-h-[52px]': size === 'lg',
          },
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button, type ButtonProps };
