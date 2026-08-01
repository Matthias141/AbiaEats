import { redirect } from 'next/navigation';
import { requireRole } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';

async function addRestaurant(formData: FormData) {
  'use server';

  // Defense in depth: the /dashboard/ops layout and middleware already gate
  // this route to admins, but a server action is a public endpoint in its
  // own right — re-verify here rather than trusting the caller got here
  // through the gated UI.
  const guard = await requireRole('admin');
  if (guard.response) redirect('/');

  const name = String(formData.get('name') ?? '').trim();
  const address = String(formData.get('address') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const zone = String(formData.get('zone') ?? '').trim();

  if (!name || !address || !phone || !zone) {
    throw new Error('All fields are required');
  }

  // The restaurants table has no "zone" column — only a two-value city_enum
  // ('aba' | 'umuahia'). The zone select below offers finer-grained Aba
  // sub-areas for the ops operator's own reference, but only the city is
  // persisted; add a `zone` column via migration if per-zone data is needed.
  const city = zone.startsWith('aba') ? 'aba' : 'umuahia';

  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${Date.now()}`;

  const supabase = await createClient();

  // restaurants.owner_id is NOT NULL and there is no owner-invite flow yet
  // for ops-created restaurants — the admin is set as owner_id as a
  // placeholder until a real restaurant_owner account is created and
  // reassigned (see restaurant_applications approval flow for that path).
  const { error } = await supabase.from('restaurants').insert({
    owner_id: guard.user.id,
    name,
    slug,
    phone,
    address,
    city,
    is_active: true,
  });

  if (error) throw new Error(error.message);

  redirect('/dashboard/ops/restaurants');
}

export default function NewRestaurantPage() {
  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Add Restaurant</h1>

      <form action={addRestaurant} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
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
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
        </div>

        <div>
          <label htmlFor="zone" className="block text-sm font-medium text-gray-700 mb-1">
            Zone
          </label>
          <select
            id="zone"
            name="zone"
            required
            defaultValue=""
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
          >
            <option value="" disabled>
              Select a zone
            </option>
            <option value="aba-central">Aba Central</option>
            <option value="aba-north">Aba North</option>
            <option value="aba-south">Aba South</option>
          </select>
        </div>

        <button
          type="submit"
          className="w-full bg-brand-orange text-white font-medium rounded-xl py-2.5 text-sm hover:opacity-90 transition-opacity"
        >
          Add Restaurant
        </button>
      </form>
    </div>
  );
}
