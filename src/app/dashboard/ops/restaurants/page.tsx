import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function OpsRestaurantsPage() {
  const supabase = await createClient();
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('id, name, address, city, is_active')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Restaurants</h1>
        <Link
          href="/dashboard/ops/restaurants/new"
          className="text-sm font-medium bg-brand-orange text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
        >
          + Add Restaurant
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-gray-500">
              <th className="px-6 py-3 font-medium">Name</th>
              <th className="px-6 py-3 font-medium">Address</th>
              <th className="px-6 py-3 font-medium">Zone</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(restaurants ?? []).map((restaurant) => (
              <tr key={restaurant.id}>
                <td className="px-6 py-4 font-medium text-gray-900">{restaurant.name}</td>
                <td className="px-6 py-4 text-gray-600">{restaurant.address}</td>
                <td className="px-6 py-4 text-gray-600 capitalize">{restaurant.city}</td>
                <td className="px-6 py-4">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                      restaurant.is_active ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'
                    }`}
                  >
                    {restaurant.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <Link
                    href={`/dashboard/ops/restaurants/${restaurant.id}`}
                    className="text-sm font-medium text-brand-orange hover:underline"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
            {(restaurants ?? []).length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center text-gray-400">
                  No restaurants yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
