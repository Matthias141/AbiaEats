import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function OpsLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/');

  // Defense in depth: middleware already gates /dashboard/ops, re-check here
  // in case this layout is ever reached by a path middleware doesn't match.
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin') redirect('/');

  const navItems = [
    { href: '/dashboard/ops', label: 'Dashboard' },
    { href: '/dashboard/ops/restaurants', label: 'Restaurants' },
    { href: '/dashboard/ops/vendors', label: 'Vendors' },
  ];

  return (
    <div className="admin-shell min-h-screen bg-gray-50 overflow-x-hidden">
      <nav className="border-b border-gray-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center gap-4">
          <span className="font-bold text-gray-900">AbiaEats Ops</span>
          {navItems.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center min-h-[44px] px-2 text-sm font-medium text-gray-600 hover:text-brand-orange transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </nav>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8">{children}</main>
    </div>
  );
}
