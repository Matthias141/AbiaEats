import Link from 'next/link';
import {
  ArrowRight,
  LogOut,
  Mail,
  MapPin,
  Phone,
  ReceiptText,
  ShieldCheck,
  ShoppingBag,
  User,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { formatPrice, orderStatusConfig, timeAgo } from '@/lib/utils';
import type { OrderStatus, Profile } from '@/types/database';

export const metadata = {
  title: 'Profile',
  description: 'Manage your AbiaEats profile and recent orders',
};

interface RecentOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  restaurants: { name: string } | null;
}

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        <div className="max-w-lg mx-auto px-4 pt-10 pb-28">
          <div className="bg-white rounded-2xl card-shadow p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mx-auto mb-5">
              <User className="w-8 h-8 text-brand-orange" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Your profile</h1>
            <p className="text-sm text-gray-500 mb-6">
              Sign in to save delivery details and track your orders.
            </p>
            <div className="grid gap-3">
              <Link
                href="/auth/login"
                className="tap-target rounded-xl gradient-orange text-white font-semibold"
              >
                Sign in
              </Link>
              <Link
                href="/auth/signup"
                className="tap-target rounded-xl border border-gray-200 bg-white text-gray-700 font-medium"
              >
                Create account
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [{ data: profile }, { data: recentOrders }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase
      .from('orders')
      .select('id, order_number, status, total, created_at, restaurants(name)')
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  const customerProfile = profile as Profile | null;
  const orders = (recentOrders || []) as unknown as RecentOrder[];

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="max-w-lg mx-auto px-4 pt-6 pb-28">
        <header className="mb-5">
          <p className="text-sm text-gray-400 mb-1">Profile</p>
          <h1 className="text-2xl font-bold text-gray-900">
            {customerProfile?.full_name || user.email}
          </h1>
        </header>

        <section className="bg-white rounded-2xl card-shadow p-5 mb-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl gradient-orange text-white flex items-center justify-center flex-shrink-0">
              <User className="w-7 h-7" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-semibold text-gray-900 truncate">
                {customerProfile?.full_name || 'AbiaEats customer'}
              </h2>
              <p className="text-sm text-gray-500 truncate">{user.email}</p>
              <span className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 rounded-full bg-green-50 text-green-600 text-xs font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                {customerProfile?.role ?? 'customer'}
              </span>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl card-shadow divide-y divide-gray-100 mb-4">
          <div className="p-4 flex items-center gap-3">
            <Mail className="w-4 h-4 text-gray-400" />
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Email</p>
              <p className="text-sm text-gray-900 truncate">{customerProfile?.email || user.email}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <Phone className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-xs text-gray-400">Phone</p>
              <p className="text-sm text-gray-900">{customerProfile?.phone || 'Not added yet'}</p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-3">
            <MapPin className="w-4 h-4 text-gray-400" />
            <div className="min-w-0">
              <p className="text-xs text-gray-400">Default address</p>
              <p className="text-sm text-gray-900 truncate">
                {customerProfile?.default_address || 'Saved after checkout'}
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white rounded-2xl card-shadow p-4 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ReceiptText className="w-4 h-4 text-brand-orange" />
              Recent orders
            </h2>
            <Link href="/restaurants" className="text-sm text-brand-orange font-medium">
              Order again
            </Link>
          </div>

          {orders.length > 0 ? (
            <div className="space-y-3">
              {orders.map((order) => {
                const cfg = orderStatusConfig[order.status];
                return (
                  <div key={order.id} className="rounded-xl bg-gray-50 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900">{order.order_number}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {order.restaurants?.name ?? 'Restaurant'} · {timeAgo(order.created_at)}
                        </p>
                      </div>
                      <p className="text-sm font-mono font-semibold text-gray-900">
                        {formatPrice(order.total)}
                      </p>
                    </div>
                    <span
                      className={`inline-flex mt-2 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bgColor} ${cfg.textColor}`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <ShoppingBag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-sm text-gray-500 mb-4">No orders yet.</p>
              <Link
                href="/restaurants"
                className="inline-flex items-center gap-1 text-sm text-brand-orange font-medium"
              >
                Browse restaurants
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </section>

        <form action="/api/auth/signout" method="POST">
          <button className="tap-target w-full rounded-xl bg-white border border-gray-200 text-gray-600 font-medium gap-2">
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
