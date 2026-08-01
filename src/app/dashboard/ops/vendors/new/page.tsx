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

  const supabase = await createClient();

  // Duplicate-invite check: an email with a pending, non-expired invite
  // cannot be re-invited — no resend, no silent no-op, and the existing row
  // is never deleted.
  const { data: existingInvite } = await supabase
    .from('vendor_invites')
    .select('id, expires_at')
    .eq('status', 'pending')
    .eq('email', email)
    .maybeSingle();

  if (existingInvite) {
    if (new Date(existingInvite.expires_at) > new Date()) {
      throw new Error('An invite for this email is already pending');
    }
    // Expired — free up the unique (email, pending) slot before inserting.
    await supabase.from('vendor_invites').update({ status: 'expired' }).eq('id', existingInvite.id);
  }

  // The invite row is written FIRST. Only a successful DB write is allowed
  // to trigger the Supabase Auth call that actually sends the invite email —
  // email delivery is a side effect of a saved invite, never the reverse.
  const { data: invite, error: insertError } = await supabase
    .from('vendor_invites')
    .insert({
      email,
      full_name: fullName,
      phone: phone || null,
      restaurant_id: restaurantId || null,
      invited_by: guard.user.id,
    })
    .select('id')
    .single();

  if (insertError || !invite) {
    // 23505 = unique violation — a concurrent request won the race for this
    // email between the check above and this insert.
    if (insertError?.code === '23505') {
      throw new Error('An invite for this email is already pending');
    }
    throw new Error(insertError?.message ?? 'Failed to save invite');
  }

  // Creates the auth.users row and sends the Supabase invite email. The
  // on_auth_user_created trigger fires off this insert and creates a
  // profiles row with role='customer' — flipped to 'restaurant_owner' below
  // once we have the new user's id.
  const adminAuth = await createAdminClient_OPS_VENDOR_INVITE_ONLY();
  const inviteArgs = {
    data: { full_name: fullName, phone: phone || undefined },
    // Invited vendors have no password yet — route them through the
    // set-password step instead of straight into the app.
    redirectTo: `${getAppUrl()}/auth/callback?next=${encodeURIComponent('/auth/set-password')}`,
  };

  let { data, error } = await adminAuth.auth.admin.inviteUserByEmail(email, inviteArgs);
  if (error || !data.user) {
    // One automatic retry, no delay, same request — before giving up.
    ({ data, error } = await adminAuth.auth.admin.inviteUserByEmail(email, inviteArgs));
  }

  if (error || !data.user) {
    // Both attempts failed. The invite row is left intact (status stays
    // 'pending') — the DB write already succeeded, only email delivery
    // failed. There is no resend UI, so the message only references
    // actions that actually exist.
    throw new Error(
      'Invite saved but email failed to send. Contact them directly or wait for the invite to expire, then re-invite.'
    );
  }

  // From here the Supabase Auth user exists and the invite email is sent.
  // If either follow-up write fails, there is no rollback and no retry —
  // the invite row is flagged so the ops panel can surface it for a manual
  // fix, per the locked decision on this failure path.
  const markNeedsManualFix = () =>
    supabase.from('vendor_invites').update({ status: 'failed_post_auth' }).eq('id', invite.id);

  const { error: roleError } = await supabase
    .from('profiles')
    .update({ role: 'restaurant_owner', phone: phone || null })
    .eq('id', data.user.id);

  if (roleError) {
    await markNeedsManualFix();
    throw new Error('Vendor account was created but role setup failed. Flagged for manual fix in the vendors list.');
  }

  if (restaurantId) {
    const { error: ownerError } = await supabase
      .from('restaurants')
      .update({ owner_id: data.user.id })
      .eq('id', restaurantId);
    if (ownerError) {
      await markNeedsManualFix();
      throw new Error('Vendor account was created but restaurant assignment failed. Flagged for manual fix in the vendors list.');
    }
  }

  const ip = (await headers()).get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1';
  await supabase.rpc('log_audit', {
    p_action: 'vendor_invited',
    p_actor_id: guard.user.id,
    p_target_type: 'profiles',
    p_target_id: data.user.id,
    p_ip_address: ip,
    p_metadata: { email, restaurant_id: restaurantId || null, invite_id: invite.id },
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
          className="w-full min-h-[44px] bg-brand-orange text-white font-medium rounded-xl text-sm hover:opacity-90 transition-opacity"
        >
          Send Invite
        </button>
      </form>
    </div>
  );
}
