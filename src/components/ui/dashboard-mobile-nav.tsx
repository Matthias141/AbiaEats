'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { DASHBOARD_NAV_ICONS, type DashboardNavIconKey } from '@/lib/dashboard-nav-icons';

interface NavItem {
  href: string;
  label: string;
  icon: DashboardNavIconKey;
}

interface DashboardMobileNavProps {
  navItems: NavItem[];
  className?: string;
}

/** Bottom tab bar shown below `lg` for portal layouts whose sidebar is desktop-only. */
export function DashboardMobileNav({ navItems, className }: DashboardMobileNavProps) {
  const pathname = usePathname();

  if (navItems.length === 0) return null;

  return (
    <nav
      className={cn(
        'lg:hidden fixed bottom-0 left-0 right-0 z-40 liquid-glass-nav border-x-0 border-b-0 safe-bottom',
        className
      )}
    >
      <div className="flex items-center justify-around px-2 h-16">
        {navItems.map(({ href, label, icon }) => {
          const isActive = pathname === href || (href !== navItems[0].href && pathname.startsWith(href));
          const Icon = DASHBOARD_NAV_ICONS[icon];

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-14 rounded-xl transition-all',
                isActive
                  ? 'liquid-chip text-brand-orange shadow-sm'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-white/35'
              )}
            >
              <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} aria-hidden="true" />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
