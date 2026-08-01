import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { requireRole, createAdminClient_OPS_VENDOR_INVITE_ONLY } from '@/lib/auth-guard';
import { createClient } from '@/lib/supabase/server';
import { getAppUrl } from '@/lib/get-app-url';

async function inviteVendor(formData: FormData) {
  'use server';

  const guard = await requireRole('admin');
  if (guard.response) redirect('/');

  const email = String(formData.get('email') ?? '').trim().toLowerCase();
  const fullName = String(formData.get('full_name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const restaurantId = String(formData.get('restaurant_id') ?? '').trim();

  if (!email || !fullName) {
    throw new Error('Email and name are required');
  }

  // Creates the auth.users row and sends the Supabase invite email. The
  // on_auth_user_created trigger fires off this insert and creates a
  // profiles row with role='customer' — flipped to 'restaurant_owner' below
  // once we have the new user's id.
  const adminAuth = await createAdminClient_OPS_VENDOR_INVITE_ONLY();
  const { data, error } = await adminAuth.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName, phone: phone || undefined },
    redirectTo: `${getAppUrl()}/auth/callback`,
  });

  if (error || !data.user) {
    throw new Error(error?.message ?? 'Failed to invite vendor');
  }

  const supabase = await createClient();
  const { error: roleError } = await supabase
    .from('profiles')
    .update({ role: 'restaurant_owner', phone: phone || null })
    .eq('id', data.user.id);

  if (roleError) throw new Error(roleError.message);

  if (restaurantId) {
    const { error: ownerError } = await supabase
      .from('restaurants')
      .update({ owner_id: data.user.id })
      .eq('id', restaurantId);
    if (ownerError) throw new Error(ownerError.message);
  }

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  await supabase.rpc('log_audit', {
    p_action: 'vendor_invited',
    p_actor_id: guard.user.id,
    p_target_type: 'profiles',
    p_target_id: data.user.id,
    p_ip_address: ip,
    p_metadata: { email, restaurant_id: restaurantId || null },
  });

  redirect('/dashboard/ops/vendors');
}

export default async function NewVendorPage() {
  const guard = await requireRole('admin');
  if (guard.response) redirect('/');

  const supabase = await createClient();
  // Restaurants still owned by the inviting admin as a placeholder (see
  // restaurants/new) are the ones a fresh vendor invite can be handed off to.
  const { data: unassignedRestaurants } = await supabase
    .from('restaurants')
    .select('id, name')
    .eq('owner_id', guard.user.id);

  return (
    <div className="max-w-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Invite Vendor</h1>

      <form action={inviteVendor} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
            Name
          </label>
          <input
            id="full_name"
            name="full_name"
            type="text"
            required
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
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
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
          />
        </div>

        {unassignedRestaurants && unassignedRestaurants.length > 0 && (
          <div>
            <label htmlFor="restaurant_id" className="block text-sm font-medium text-gray-700 mb-1">
              Assign restaurant (optional)
            </label>
            <select
              id="restaurant_id"
              name="restaurant_id"
              defaultValue=""
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange"
            >
              <option value="">None</option>
              {unassignedRestaurants.map((restaurant) => (
                <option key={restaurant.id} value={restaurant.id}>
                  {restaurant.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="submit"
          className="w-full bg-brand-orange text-white font-medium rounded-xl py-2.5 text-sm hover:opacity-90 transition-opacity"
        >
          Send Invite
        </button>
      </form>
    </div>
  );
}
