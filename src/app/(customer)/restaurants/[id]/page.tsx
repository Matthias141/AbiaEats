import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { RestaurantDetail } from '@/components/customer/restaurant-detail';
import { getMockRestaurant, getMockMenuItems } from '@/lib/mock-data';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Reject non-UUID ids immediately — avoids wasting a DB connection on junk input
  if (!UUID_RE.test(id)) {
    // Still allow mock-data lookup for local dev (mock IDs may not be UUIDs)
    if (process.env.NODE_ENV === 'production') {
      notFound();
    }
    const mockRestaurant = getMockRestaurant(id);
    if (!mockRestaurant) notFound();
    return (
      <RestaurantDetail
        restaurant={mockRestaurant}
        menuItems={getMockMenuItems(id)}
      />
    );
  }

  // Try Supabase first
  try {
    const supabase = await createClient();

    const { data: restaurant } = await supabase
      .from('restaurants_public')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .single();

    if (restaurant) {
      const { data: menuItems } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', id)
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

      return (
        <RestaurantDetail
          restaurant={restaurant}
          menuItems={menuItems || []}
        />
      );
    }
  } catch {
    // Supabase not configured — fall through to mock data in dev only
  }

  // Mock data fallback — development only to avoid masking Supabase outages
  if (process.env.NODE_ENV !== 'production') {
    const mockRestaurant = getMockRestaurant(id);
    if (mockRestaurant) {
      return (
        <RestaurantDetail
          restaurant={mockRestaurant}
          menuItems={getMockMenuItems(id)}
        />
      );
    }
  }

  notFound();
}
