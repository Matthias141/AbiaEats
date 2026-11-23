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

  let loadingFailed = false;
  // Try Supabase first
  try {
    const supabase = await createClient();

    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants_public')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (restaurantError) throw new Error("Restaurant unavailable");

    if (restaurant) {
      const { data: menuItems, error: menuError } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', id)
        .eq('is_available', true)
        .order('sort_order', { ascending: true });

      if (menuError) throw new Error("Menu unavailable");

      return (
        <RestaurantDetail
          restaurant={restaurant}
          menuItems={menuItems || []}
        />
      );
    }
  } catch {
    loadingFailed = true;
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

  if (loadingFailed) throw new Error("Restaurant or menu unavailable");
  notFound();
}
