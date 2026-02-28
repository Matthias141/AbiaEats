'use client';

import { useState, useEffect, useCallback } from 'react';
import { formatPrice, orderStatusConfig } from '@/lib/utils';
import { Check } from 'lucide-react';
import type { OrderStatus } from '@/types/database';

const STATUS_FILTERS = [
  { value: '', label: 'All Orders' },
  { value: 'awaiting_payment', label: 'Awaiting Payment' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'preparing', label: 'Preparing' },
  { value: 'out_for_delivery', label: 'Out for Delivery' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'cancelled', label: 'Cancelled' },
];

interface Order {
  id: string;
  order_number: string;
  status: OrderStatus;
  total: number;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  payment_reference: string | null;
  created_at: string;
  restaurants: { name: string } | null;
  profiles: { full_name: string; email: string } | null;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('awaiting_payment');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [paymentRef, setPaymentRef] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const qs = statusFilter ? `?status=${statusFilter}` : '';
    const res = await fetch(`/api/admin/orders${qs}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const confirmPayment = async () => {
    if (!selectedOrder) return;
    setActionLoading(true);
    const res = await fetch('/api/admin/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order_id: selectedOrder.id, payment_reference: paymentRef }),
    });
    setActionLoading(false);
    if (res.ok) {
      showToast('Payment confirmed');
      setSelectedOrder(null);
      setPaymentRef('');
      fetchOrders();
    } else {
      const d = await res.json();
      showToast(d.error || 'Failed');
    }
  };

  const updateStatus = async (orderId: string, status: OrderStatus) => {
    const res = await fetch(`/api/admin/orders/${orderId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { showToast(`Order marked ${status}`); fetchOrders(); }
    else { const d = await res.json(); showToast(d.error || 'Failed'); }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
        <p className="text-gray-500 text-sm mt-1">Manage and track all customer orders</p>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {STATUS_FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => setStatusFilter(f.value)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              statusFilter === f.value
                ? 'gradient-orange text-white shadow-sm'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Orders table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400 text-sm">Loading...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">No orders found</div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                {['Order', 'Customer', 'Restaurant', 'Status', 'Total', 'Actions'].map(h => (
                  <th key={h} className="px-5 py-3.5 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(order => {
                const cfg = orderStatusConfig[order.status];
                return (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-gray-900">{order.order_number}</p>
                      <p className="text-xs text-gray-400">{new Date(order.created_at).toLocaleString('en-NG', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm text-gray-900">{order.customer_name}</p>
                      <p className="text-xs text-gray-400">{order.customer_phone}</p>
                    </td>
                    <td className="px-5 py-4 text-sm text-gray-600">
                      {(order.restaurants as unknown as { name: string } | null)?.name ?? '—'}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${cfg.bgColor} ${cfg.textColor}`}>
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-sm font-semibold text-gray-900">{formatPrice(order.total)}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        {order.status === 'awaiting_payment' && (
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" /> Confirm Payment
                          </button>
                        )}
                        {order.status === 'confirmed' && (
                          <button
                            onClick={() => updateStatus(order.id, 'preparing')}
                            className="px-3 py-1.5 bg-purple-50 text-purple-700 text-xs font-medium rounded-lg hover:bg-purple-100 transition-colors"
                          >
                            Mark Preparing
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button
                            onClick={() => updateStatus(order.id, 'out_for_delivery')}
                            className="px-3 py-1.5 bg-orange-50 text-orange-700 text-xs font-medium rounded-lg hover:bg-orange-100 transition-colors"
                          >
                            Out for Delivery
                          </button>
                        )}
                        {order.status === 'out_for_delivery' && (
                          <button
                            onClick={() => updateStatus(order.id, 'delivered')}
                            className="px-3 py-1.5 bg-green-50 text-green-700 text-xs font-medium rounded-lg hover:bg-green-100 transition-colors"
                          >
                            Mark Delivered
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Payment confirmation modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setSelectedOrder(null)} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Confirm Payment</h3>
            <p className="text-sm text-gray-500 mb-5">
              Order {selectedOrder.order_number} — {formatPrice(selectedOrder.total)}
            </p>
            <div className="bg-gray-50 rounded-xl p-4 mb-5 text-sm space-y-1">
              <p><span className="text-gray-500">Customer:</span> <span className="font-medium">{selectedOrder.customer_name}</span></p>
              <p><span className="text-gray-500">Delivery:</span> <span className="font-medium">{selectedOrder.delivery_address}</span></p>
            </div>
            <div className="mb-5">
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Payment Reference (optional)</label>
              <input
                type="text"
                placeholder="e.g. OPay transaction ID"
                value={paymentRef}
                onChange={e => setPaymentRef(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmPayment}
                disabled={actionLoading}
                className="flex-1 py-2.5 gradient-orange text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-all"
              >
                {actionLoading ? 'Confirming...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
