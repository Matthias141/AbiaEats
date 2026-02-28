import { createClient } from '@/lib/supabase/server';
import { formatPrice, orderStatusConfig } from '@/lib/utils';
import { ShoppingBag, Store, Clock, TrendingUp } from 'lucide-react';
import type { OrderStatus } from '@/types/database';

export default async function AdminDashboard() {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [ordersToday, pendingPayment, pendingApps, totalRevenue] = await Promise.all([
    supabase.from('orders').select('id', { count: 'exact', head: true }).gte('created_at', today.toISOString()),
    supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'awaiting_payment'),
    supabase.from('restaurant_applications').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('orders').select('total').eq('status', 'delivered'),
  ]);

  const revenue = (totalRevenue.data || []).reduce((sum, o) => sum + o.total, 0);

  const { data: recentOrders } = await supabase
    .from('orders')
    .select('id, order_number, status, total, customer_name, created_at, restaurants(name)')
    .order('created_at', { ascending: false })
    .limit(10);

  const stats = [
    { label: "Orders Today", value: ordersToday.count ?? 0, icon: ShoppingBag, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: "Awaiting Payment", value: pendingPayment.count ?? 0, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: "Pending Applications", value: pendingApps.count ?? 0, icon: Store, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: "Total Revenue", value: formatPrice(revenue), icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back. Here&apos;s what&apos;s happening.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-5 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center mb-4`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Recent orders */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">Recent Orders</h2>
          <a href="/admin/orders" className="text-sm text-brand-orange hover:underline font-medium">View all</a>
        </div>
        <div className="divide-y divide-gray-50">
          {(recentOrders || []).map((order) => {
            const cfg = orderStatusConfig[order.status as OrderStatus];
            const restaurant = order.restaurants as unknown as { name: string } | null;
            return (
              <div key={order.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div>
                  <p className="text-sm font-medium text-gray-900">{order.order_number}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{order.customer_name} · {restaurant?.name}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bgColor} ${cfg.textColor}`}>
                    {cfg.label}
                  </span>
                  <span className="text-sm font-semibold text-gray-900">{formatPrice(order.total)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
