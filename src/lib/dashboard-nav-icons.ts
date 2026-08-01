import { LayoutDashboard, ShoppingBag, Store, UtensilsCrossed, type LucideIcon } from 'lucide-react';

/**
 * Icon components can't cross the Server -> Client boundary as props (Next.js
 * rejects non-serializable function values), so portal nav items carry a
 * string key and each side (server layout, client DashboardMobileNav)
 * resolves it from this shared map instead of passing the component itself.
 */
export type DashboardNavIconKey = 'dashboard' | 'orders' | 'applications' | 'menu';

export const DASHBOARD_NAV_ICONS: Record<DashboardNavIconKey, LucideIcon> = {
  dashboard: LayoutDashboard,
  orders: ShoppingBag,
  applications: Store,
  menu: UtensilsCrossed,
};
