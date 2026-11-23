import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';

async function toggleVendorActive(id: string, nextActive: boolean) {
  'use server';

  const guard = await requireRole('admin');
  if (guard.response) redirect('/');

  const supabase = await createClient();
  const { error } = await supabase.from('profiles').update({ is_active: nextActive }).eq('id', id);
  if (error) throw new Error(error.message);

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  const { error: auditError } = await supabase.rpc('log_audit', {
    p_action: nextActive ? 'vendor_activated' : 'vendor_deactivated',
    p_actor_id: guard.user.id,
    p_target_type: 'profiles',
    p_target_id: id,
    p_ip_address: ip,
    p_metadata: {},
  });
  if (auditError) {
    console.error(`[audit] Failed to record vendor status change for ${id}:`, auditError.message);
  }

  redirect('/dashboard/ops/vendors');
}

export default async function OpsVendorsPage() {
  const guard = await requireRole('admin');
  if (guard.response) redirect('/');

  const supabase = await createClient();

  const [{ data: vendors }, { data: restaurants }, { data: needsManualFix }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, phone, is_active')
      .eq('role', 'restaurant_owner')
      .order('created_at', { ascending: false }),
    supabase.from('restaurants').select('id, name, owner_id'),
    // Invites where the Supabase Auth account was created but the follow-up
    // role/restaurant writes failed — no automatic rollback or retry, this
    // is purely surfaced for the operator to fix manually (see
    // dashboard/ops/vendors/new/page.tsx).
    supabase
      .from('vendor_invites')
      .select('id, email, full_name, created_at')
      .eq('status', 'failed_post_auth')
      .order('created_at', { ascending: false }),
  ]);

  const restaurantsByOwner = new Map<string, string[]>();
  for (const restaurant of restaurants ?? []) {
    const list = restaurantsByOwner.get(restaurant.owner_id) ?? [];
    list.push(restaurant.name);
    restaurantsByOwner.set(restaurant.owner_id, list);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Vendors</h1>
        <Link
          href="/dashboard/ops/vendors/new"
          className="inline-flex items-center justify-center min-h-[44px] text-sm font-medium bg-brand-orange text-white px-4 rounded-xl hover:opacity-90 transition-opacity"
        >
          + Invite Vendor
        </Link>
      </div>

      {(needsManualFix ?? []).length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-100 rounded-2xl p-4">
          <p className="flex items-start gap-2 text-sm font-medium text-red-700 mb-3">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            <span>{needsManualFix!.length} invite{needsManualFix!.length > 1 ? 's' : ''} need{needsManualFix!.length > 1 ? '' : 's'} a manual fix</span>
          </p>
          <div className="space-y-2">
            {needsManualFix!.map((item) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-gray-900">{item.full_name}</span>{' '}
                  <span className="text-gray-500">({item.email})</span>
                </div>
                <span className="inline-flex items-center min-h-[28px] px-2.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                  Needs manual fix
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-red-600 mt-3">
            The account was created but role/restaurant setup failed. Fix directly in Supabase.
          </p>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Contact</th>
              <th className="px-6 py-3 font-medium">Restaurant(s)</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(vendors ?? []).map((vendor) => {
              const owned = restaurantsByOwner.get(vendor.id) ?? [];
              const deactivate = toggleVendorActive.bind(null, vendor.id, false);
              const activate = toggleVendorActive.bind(null, vendor.id, true);
              return (
                <tr key={vendor.id}>
                  <td className="px-6 py-4 font-medium text-gray-900">{vendor.full_name ?? '—'}</td>
                  <td className="px-6 py-4 text-gray-600">
                    <div>{vendor.email}</div>
                    {vendor.phone && <div className="text-xs text-gray-400">{vendor.phone}</div>}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{owned.length > 0 ? owned.join(', ') : '—'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        vendor.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {vendor.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <form action={vendor.is_active ? deactivate : activate}>
                      <button
                        type="submit"
                        className={`inline-flex items-center justify-center min-h-[44px] px-2 text-sm font-medium ${
                          vendor.is_active ? 'text-red-600 hover:underline' : 'text-green-600 hover:underline'
                        }`}
                      >
                        {vendor.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {(vendors ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                  <div className="text-2xl mb-2">🧑‍🍳</div>
                  <p className="mb-3">No vendors yet.</p>
                  <Link
                    href="/dashboard/ops/vendors/new"
                    className="inline-flex items-center justify-center min-h-[44px] text-sm font-medium text-brand-orange hover:underline"
                  >
                    + Invite your first vendor
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
