import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { UtensilsCrossed, LayoutDashboard, UtensilsCrossed as MenuIcon, ShoppingBag } from 'lucide-react';
import { DashboardMobileNav } from '@/components/ui/dashboard-mobile-nav';

export default async function RestaurantLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login?redirectTo=/restaurant');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  // Allow restaurant_owners and applicants (customers who submitted an application)
  if (profile?.role === 'admin') redirect('/admin');

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, is_open, is_active')
    .eq('owner_id', user.id)
    .single();

  const navItems = restaurant ? [
    { href: '/restaurant', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/restaurant/menu', label: 'Menu', icon: MenuIcon },
    { href: '/restaurant/orders', label: 'Orders', icon: ShoppingBag },
  ] : [];

  return (
    <div className="min-h-screen liquid-surface flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden lg:flex w-60 liquid-glass-nav border-y-0 border-l-0 flex-col fixed h-full z-40">
        <div className="p-5 border-b border-white/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg gradient-orange flex items-center justify-center">
              <UtensilsCrossed className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 truncate">{restaurant?.name ?? 'AbiaEats'}</p>
              <p className="text-xs text-gray-400">Restaurant Portal</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-white/45 hover:text-gray-900 transition-colors"
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="p-3 border-t border-white/60 text-xs text-gray-400 px-4">
          {profile?.full_name ?? user.email}
        </div>
      </aside>

      <main className="flex-1 min-h-screen p-4 pb-24 sm:p-6 lg:ml-60 lg:p-8 lg:pb-8">
        {children}
      </main>

      <DashboardMobileNav navItems={navItems} />
    </div>
  );
}
