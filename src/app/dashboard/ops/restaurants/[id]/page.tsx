import { notFound, redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';

interface Params {
  params: Promise<{ id: string }>;
}

async function updateRestaurant(id: string, formData: FormData) {
  'use server';

  const guard = await requireRole('admin');
  if (guard.response) redirect('/');

  const name = String(formData.get('name') ?? '').trim();
  const address = String(formData.get('address') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const city = String(formData.get('city') ?? '').trim();

  if (!name || !address || !phone || (city !== 'aba' && city !== 'umuahia')) {
    throw new Error('All fields are required');
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('restaurants')
    .update({ name, address, phone, city })
    .eq('id', id);

  if (error) throw new Error(error.message);

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  await supabase.rpc('log_audit', {
    p_action: 'restaurant_updated',
    p_actor_id: guard.user.id,
    p_target_type: 'restaurants',
    p_target_id: id,
    p_ip_address: ip,
    p_metadata: { name, address, phone, city },
  });

  redirect('/dashboard/ops/restaurants');
}

// Business rule (CLAUDE.md §12.14): restaurants can toggle open/closed
// themselves, but only an admin can activate/deactivate the listing itself.
async function toggleActive(id: string, nextActive: boolean) {
  'use server';

  const guard = await requireRole('admin');
  if (guard.response) redirect('/');

  const supabase = await createClient();
  const { error } = await supabase.from('restaurants').update({ is_active: nextActive }).eq('id', id);
  if (error) throw new Error(error.message);

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  await supabase.rpc('log_audit', {
    p_action: nextActive ? 'restaurant_activated' : 'restaurant_deactivated',
    p_actor_id: guard.user.id,
    p_target_type: 'restaurants',
    p_target_id: id,
    p_ip_address: ip,
    p_metadata: {},
  });

  redirect('/dashboard/ops/restaurants');
}

export default async function EditRestaurantPage({ params }: Params) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, address, phone, city, is_active')
    .eq('id', id)
    .single();

  if (!restaurant) notFound();

  const updateWithId = updateRestaurant.bind(null, id);
  const deactivate = toggleActive.bind(null, id, false);
  const activate = toggleActive.bind(null, id, true);

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Restaurant</h1>

      <form action={updateWithId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            defaultValue={restaurant.name}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            Address
          </label>
          <input
            id="address"
            name="address"
            type="text"
            required
            defaultValue={restaurant.address}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            Phone
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            required
            defaultValue={restaurant.phone}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
        </div>

        <div>
          <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
            City
          </label>
          <select
            id="city"
            name="city"
            required
            defaultValue={restaurant.city}
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
          >
            <option value="aba">Aba</option>
            <option value="umuahia">Umuahia</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-brand-orange text-white font-medium rounded-xl py-2.5 text-sm hover:opacity-90 transition-opacity"
        >
          Save Changes
        </button>
      </form>

      <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">Listing status</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {restaurant.is_active ? 'Live and visible to customers.' : 'Hidden from customers.'}
          </p>
        </div>
        <form action={restaurant.is_active ? deactivate : activate}>
          <button
            type="submit"
            className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
              restaurant.is_active
                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            {restaurant.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </form>
      </div>
    </div>
  );
}
