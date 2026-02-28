import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Clock, CheckCircle, XCircle, Store } from 'lucide-react';
import { formatPrice } from '@/lib/utils';

export default async function RestaurantPortalHome() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Check if they already own a restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('owner_id', user.id)
    .single();

  if (restaurant) {
    // Dashboard for approved restaurant owners
    const [ordersToday, totalOrders, revenue] = await Promise.all([
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', new Date(new Date().setHours(0,0,0,0)).toISOString()),
      supabase.from('orders').select('id', { count: 'exact', head: true })
        .eq('restaurant_id', restaurant.id)
        .eq('status', 'delivered'),
      supabase.from('orders').select('total').eq('restaurant_id', restaurant.id).eq('status', 'delivered'),
    ]);

    const totalRevenue = (revenue.data || []).reduce((s, o) => s + o.total, 0);

    return (
      <div>
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{restaurant.name}</h1>
            <p className="text-gray-500 text-sm mt-1">{restaurant.address}, {restaurant.city}</p>
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
            restaurant.is_open ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'
          }`}>
            <div className={`w-2 h-2 rounded-full ${restaurant.is_open ? 'bg-green-500' : 'bg-gray-400'}`} />
            {restaurant.is_open ? 'Open' : 'Closed'}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-5 mb-8">
          {[
            { label: 'Orders Today', value: ordersToday.count ?? 0 },
            { label: 'Total Delivered', value: totalOrders.count ?? 0 },
            { label: 'Total Revenue', value: formatPrice(totalRevenue) },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
              <p className="text-2xl font-bold text-gray-900">{value}</p>
              <p className="text-sm text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-4">
          <Link href="/restaurant/menu" className="flex-1 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-brand-orange/30 transition-colors group">
            <h3 className="font-semibold text-gray-900 group-hover:text-brand-orange transition-colors">Manage Menu →</h3>
            <p className="text-sm text-gray-500 mt-1">Add, edit, and organise your menu items</p>
          </Link>
          <Link href="/restaurant/orders" className="flex-1 bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:border-brand-orange/30 transition-colors group">
            <h3 className="font-semibold text-gray-900 group-hover:text-brand-orange transition-colors">View Orders →</h3>
            <p className="text-sm text-gray-500 mt-1">Track incoming and active orders</p>
          </Link>
        </div>
      </div>
    );
  }

  // Check for existing application
  const { data: application } = await supabase
    .from('restaurant_applications')
    .select('*')
    .eq('applicant_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (application) {
    const statusMap = {
      pending: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Under Review', msg: 'Your application is being reviewed. We\'ll notify you within 24-48 hours.' },
      approved: { icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', label: 'Approved', msg: 'Your restaurant has been approved and created!' },
      rejected: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Rejected', msg: application.rejection_reason || 'Your application was not approved.' },
    };
    const s = statusMap[application.status as keyof typeof statusMap];
    const Icon = s.icon;

    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className={`w-16 h-16 ${s.bg} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
          <Icon className={`w-8 h-8 ${s.color}`} />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Application {s.label}</h2>
        <p className="text-gray-500 text-sm mb-6">{s.msg}</p>
        <p className="text-xs text-gray-400">Applied for: <strong className="text-gray-600">{application.name}</strong></p>
        {application.status === 'rejected' && (
          <Link href="/restaurant/apply" className="mt-6 inline-block px-6 py-2.5 gradient-orange text-white text-sm font-medium rounded-xl">
            Apply Again
          </Link>
        )}
      </div>
    );
  }

  // No restaurant, no application — show CTA
  return (
    <div className="max-w-lg mx-auto text-center py-20">
      <div className="w-16 h-16 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
        <Store className="w-8 h-8 text-brand-orange" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">List your restaurant</h2>
      <p className="text-gray-500 text-sm mb-6">
        Join AbiaEats and reach thousands of customers in Aba and Umuahia. Apply in under 5 minutes.
      </p>
      <Link href="/restaurant/apply" className="inline-block px-6 py-3 gradient-orange text-white font-medium rounded-xl shadow-lg shadow-brand-orange/20">
        Apply Now
      </Link>
    </div>
  );
}
