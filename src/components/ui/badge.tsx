import { type HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import type { OrderStatus } from '@/types/database';
import { orderStatusConfig } from '@/lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'status';
  status?: OrderStatus;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', status, children, ...props }, ref) => {
    const statusStyles = status ? orderStatusConfig[status] : null;

    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border',
          {
            'bg-gray-100 border-gray-200 text-gray-700': variant === 'default' && !status,
          },
          status && statusStyles && `${statusStyles.bgColor} ${statusStyles.textColor} border-current/20`,
          className
        )}
        {...props}
      >
        {status && (
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: statusStyles?.color }}
          />
        )}
        {children || (status && statusStyles?.label)}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export { Badge };
