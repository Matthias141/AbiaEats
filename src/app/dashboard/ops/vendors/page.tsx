import Link from 'next/link';
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
  await supabase.rpc('log_audit', {
    p_action: nextActive ? 'vendor_activated' : 'vendor_deactivated',
    p_actor_id: guard.user.id,
    p_target_type: 'profiles',
    p_target_id: id,
    p_ip_address: ip,
    p_metadata: {},
  });

  redirect('/dashboard/ops/vendors');
}

export default async function OpsVendorsPage() {
  const supabase = await createClient();

  const [{ data: vendors }, { data: restaurants }] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, phone, is_active')
      .eq('role', 'restaurant_owner')
      .order('created_at', { ascending: false }),
    supabase.from('restaurants').select('id, name, owner_id'),
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
          className="text-sm font-medium bg-brand-orange text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
        >
          + Invite Vendor
        </Link>
      </div>

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
                        className={`text-sm font-medium ${
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
                  No vendors yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
