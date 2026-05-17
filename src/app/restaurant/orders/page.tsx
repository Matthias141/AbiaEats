import { revalidatePath } from 'next/cache';
import { Clock, MapPin, Phone, ReceiptText, ShoppingBag } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { canTransition, formatPrice, orderStatusConfig, timeAgo } from '@/lib/utils';
import type { OrderStatus } from '@/types/database';

interface RestaurantOrder {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  subtotal: number;
  delivery_fee: number;
  delivery_address: string;
  delivery_landmark: string | null;
  customer_name: string;
  customer_phone: string;
  created_at: string;
  order_items: { name: string; quantity: number; subtotal: number }[];
}

const OWNER_STATUS_ACTIONS: Partial<Record<OrderStatus, { next: OrderStatus; label: string }>> = {
  confirmed: { next: 'preparing', label: 'Start preparing' },
  preparing: { next: 'out_for_delivery', label: 'Send out' },
  out_for_delivery: { next: 'delivered', label: 'Mark delivered' },
};

const OWNER_NEXT_STATUSES: OrderStatus[] = ['preparing', 'out_for_delivery', 'delivered'];

async function updateRestaurantOrderStatus(formData: FormData) {
  'use server';

  const orderId = String(formData.get('orderId') ?? '');
  const nextStatus = String(formData.get('status') ?? '') as OrderStatus;

  if (!orderId || !OWNER_NEXT_STATUSES.includes(nextStatus)) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id')
    .eq('owner_id', user.id)
    .single();

  if (!restaurant) return;

  const { data: order } = await supabase
    .from('orders')
    .select('status')
    .eq('id', orderId)
    .eq('restaurant_id', restaurant.id)
    .single();

  if (!order || !canTransition(order.status as OrderStatus, nextStatus)) return;

  const timestampField: Partial<Record<OrderStatus, string>> = {
    preparing: 'preparing_at',
    out_for_delivery: 'out_for_delivery_at',
    delivered: 'delivered_at',
  };

  const updatePayload: Record<string, unknown> = { status: nextStatus };
  const timestamp = timestampField[nextStatus];
  if (timestamp) updatePayload[timestamp] = new Date().toISOString();

  await supabase.from('orders').update(updatePayload).eq('id', orderId);

  revalidatePath('/restaurant');
  revalidatePath('/restaurant/orders');
}

export default async function RestaurantOrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: restaurant } = user
    ? await supabase
        .from('restaurants')
        .select('id, name')
        .eq('owner_id', user.id)
        .single()
    : { data: null };

  if (!restaurant) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">No restaurant found</h1>
        <p className="text-sm text-gray-500">
          Your restaurant orders will appear here after your application is approved.
        </p>
      </div>
    );
  }

  const { data } = await supabase
    .from('orders')
    .select(
      `
      id,
      order_number,
      status,
      total,
      subtotal,
      delivery_fee,
      delivery_address,
      delivery_landmark,
      customer_name,
      customer_phone,
      created_at,
      order_items(name, quantity, subtotal)
    `
    )
    .eq('restaurant_id', restaurant.id)
    .order('created_at', { ascending: false })
    .limit(50);

  const orders = (data || []) as unknown as RestaurantOrder[];
  const activeCount = orders.filter((order) =>
    ['confirmed', 'preparing', 'out_for_delivery'].includes(order.status)
  ).length;
  const awaitingPaymentCount = orders.filter((order) => order.status === 'awaiting_payment').length;

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">
            Track incoming and active orders for {restaurant.name}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total orders', value: orders.length },
          { label: 'Active now', value: activeCount },
          { label: 'Awaiting payment', value: awaitingPaymentCount },
        ].map(({ label, value }) => (
          <div key={label} className="liquid-glass rounded-2xl p-5">
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {orders.length === 0 ? (
        <div className="liquid-glass rounded-2xl p-12 text-center">
          <ReceiptText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h2 className="font-semibold text-gray-900 mb-1">No orders yet</h2>
          <p className="text-sm text-gray-500">New customer orders will show up here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const cfg = orderStatusConfig[order.status];
            const action = OWNER_STATUS_ACTIONS[order.status];

            return (
              <div
                key={order.id}
                className="liquid-glass rounded-2xl p-5"
              >
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-semibold text-gray-900">{order.order_number}</h2>
                      <span
                        className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bgColor} ${cfg.textColor}`}
                      >
                        {cfg.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                      {order.customer_name} · {timeAgo(order.created_at)}
                    </p>
                  </div>
                  <p className="text-lg font-mono font-bold text-gray-900">
                    {formatPrice(order.total)}
                  </p>
                </div>

                <div className="grid md:grid-cols-[1fr_280px] gap-5">
                  <div>
                    <div className="flex items-start gap-2 text-sm text-gray-600 mb-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span>
                        {order.delivery_address}
                        {order.delivery_landmark ? ` · ${order.delivery_landmark}` : ''}
                      </span>
                    </div>
                    {order.customer_phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <span>{order.customer_phone}</span>
                      </div>
                    )}

                    <div className="rounded-xl liquid-glass-soft divide-y divide-white/60">
                      {order.order_items.map((item) => (
                        <div
                          key={`${order.id}-${item.name}`}
                          className="flex items-center justify-between px-3 py-2.5 text-sm"
                        >
                          <span className="text-gray-700">
                            {item.name} x{item.quantity}
                          </span>
                          <span className="font-mono text-gray-900">
                            {formatPrice(item.subtotal)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="liquid-glass-soft rounded-xl p-4 h-fit">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <Clock className="w-4 h-4" />
                      <span>Next step</span>
                    </div>
                    {order.status === 'awaiting_payment' ? (
                      <p className="text-sm text-gray-600">
                        Waiting for admin payment confirmation.
                      </p>
                    ) : action ? (
                      <form action={updateRestaurantOrderStatus}>
                        <input type="hidden" name="orderId" value={order.id} />
                        <input type="hidden" name="status" value={action.next} />
                        <button className="w-full py-2.5 rounded-xl gradient-orange text-white text-sm font-medium active:scale-[0.98] transition-transform">
                          {action.label}
                        </button>
                      </form>
                    ) : (
                      <p className="text-sm text-gray-600">
                        No action needed for this order.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
