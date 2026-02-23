import { createClient } from '@/lib/supabase/server';
import { RestaurantList } from '@/components/customer/restaurant-list';
import Link from 'next/link';
import { ArrowLeft, MapPin } from 'lucide-react';

export const metadata = {
  title: 'Restaurants',
  description: 'Browse restaurants in Aba and Umuahia',
};

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string; city?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('restaurants')
    .select('*')
    .eq('is_active', true)
    .order('total_orders', { ascending: false });

  if (params.city) {
    query = query.eq('city', params.city);
  }

  if (params.tag) {
    query = query.contains('cuisine_tags', [params.tag]);
  }

  if (params.q) {
    query = query.ilike('name', `%${params.q}%`);
  }

  const { data: restaurants } = await query;

  return (
    <div className="min-h-screen bg-dark-bg overflow-x-hidden">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-dark-border/50 backdrop-blur-xl bg-dark-bg/80">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="tap-target w-10 h-10 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center hover:border-dark-border-light transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <div>
                <h1 className="font-heading text-lg font-bold">Restaurants</h1>
                <div className="flex items-center gap-1 text-xs text-foreground/50">
                  <MapPin className="w-3 h-3" />
                  <span>Aba & Umuahia</span>
                </div>
              </div>
            </div>
            <Link
              href="/auth/login"
              className="tap-target px-4 py-2 text-sm font-medium text-foreground/70 hover:text-foreground transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        <RestaurantList
          restaurants={restaurants || []}
          activeTag={params.tag}
          searchQuery={params.q}
        />
      </div>
    </div>
  );
}
