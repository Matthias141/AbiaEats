'use client';

import { useState, useEffect, useCallback } from 'react';
import { Check, X, MapPin, Phone, Clock, Building2 } from 'lucide-react';

interface Application {
  id: string;
  name: string;
  description: string | null;
  phone: string;
  address: string;
  city: string;
  cuisine_tags: string[];
  delivery_fee: number;
  min_delivery_time: number;
  max_delivery_time: number;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  status: string;
  created_at: string;
  profiles: { full_name: string; email: string; phone: string } | null;
}

export default function AdminApplicationsPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selected, setSelected] = useState<Application | null>(null);
  const [commissionRate, setCommissionRate] = useState('10');
  const [rejectionReason, setRejectionReason] = useState('');
  const [mode, setMode] = useState<'approve' | 'reject' | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState('');

  const fetchApps = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/applications?status=${statusFilter}`);
    const data = await res.json();
    setApps(data.applications || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchApps(); }, [fetchApps]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const submit = async () => {
    if (!selected || !mode) return;
    setActionLoading(true);

    const body = mode === 'approve'
      ? { action: 'approve', commission_rate: parseFloat(commissionRate) || 10 }
      : { action: 'reject', rejection_reason: rejectionReason };

    const res = await fetch(`/api/admin/applications/${selected.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    setActionLoading(false);

    if (res.ok) {
      showToast(mode === 'approve' ? 'Restaurant approved and created!' : 'Application rejected');
      setSelected(null);
      setMode(null);
      setRejectionReason('');
      fetchApps();
    } else {
      const d = await res.json();
      showToast(d.error || 'Action failed');
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Restaurant Applications</h1>
        <p className="text-gray-500 text-sm mt-1">Review and approve new restaurant registrations</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {['pending', 'approved', 'rejected'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-xl text-sm font-medium capitalize transition-all ${
              statusFilter === s ? 'gradient-orange text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Applications grid */}
      {loading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Loading...</div>
      ) : apps.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Building2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 text-sm">No {statusFilter} applications</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          {apps.map(app => (
            <div key={app.id} className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900">{app.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{app.profiles?.email}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                  app.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                  app.status === 'approved' ? 'bg-green-50 text-green-600' :
                  'bg-red-50 text-red-600'
                }`}>{app.status}</span>
              </div>

              {app.description && (
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{app.description}</p>
              )}

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <MapPin className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="truncate">{app.address}, {app.city}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Phone className="w-3.5 h-3.5" />{app.phone}
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="w-3.5 h-3.5" />{app.min_delivery_time}–{app.max_delivery_time} min
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {app.cuisine_tags.map(t => (
                  <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>

              {app.status === 'pending' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setSelected(app); setMode('reject'); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 border border-red-200 text-red-600 text-xs font-medium rounded-xl hover:bg-red-50 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => { setSelected(app); setMode('approve'); }}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 gradient-orange text-white text-xs font-medium rounded-xl transition-colors"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action modal */}
      {selected && mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setSelected(null); setMode(null); }} />
          <div className="relative bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              {mode === 'approve' ? 'Approve Application' : 'Reject Application'}
            </h3>
            <p className="text-sm text-gray-500 mb-5">{selected.name}</p>

            {mode === 'approve' ? (
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Commission Rate (%)</label>
                <input
                  type="number"
                  min="0" max="100" step="0.5"
                  value={commissionRate}
                  onChange={e => setCommissionRate(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-orange"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  AbiaEats earns {commissionRate}% on each order. Restaurant gets {(100 - parseFloat(commissionRate || '0')).toFixed(1)}%.
                </p>
                {selected.bank_account_number && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-xl text-xs space-y-1">
                    <p className="font-medium text-gray-700">Bank Details</p>
                    <p className="text-gray-500">{selected.bank_name} · {selected.bank_account_number}</p>
                    <p className="text-gray-500">{selected.bank_account_name}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Rejection Reason</label>
                <textarea
                  rows={3}
                  placeholder="Explain why this application is being rejected..."
                  value={rejectionReason}
                  onChange={e => setRejectionReason(e.target.value)}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:border-brand-orange"
                />
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setSelected(null); setMode(null); }}
                className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                disabled={actionLoading || (mode === 'reject' && !rejectionReason.trim())}
                className={`flex-1 py-2.5 text-white text-sm font-medium rounded-xl disabled:opacity-50 transition-all ${
                  mode === 'approve' ? 'gradient-orange' : 'bg-red-500 hover:bg-red-600'
                }`}
              >
                {actionLoading ? 'Processing...' : mode === 'approve' ? 'Approve & Create Restaurant' : 'Reject Application'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm px-5 py-3 rounded-xl shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
