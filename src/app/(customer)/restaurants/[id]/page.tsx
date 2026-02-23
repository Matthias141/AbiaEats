import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { RestaurantDetail } from '@/components/customer/restaurant-detail';

export default async function RestaurantPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .eq('is_active', true)
    .single();

  if (!restaurant) {
    notFound();
  }

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
