'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Restaurant, MenuItem } from '@/types/database';
import { useAuth } from './use-auth';

export function useRestaurant() {
  const { user, isRestaurantOwner } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();

  const fetchRestaurant = useCallback(async () => {
    if (!user || !isRestaurantOwner) {
      setIsLoading(false);
      return;
    }

    const { data } = await supabase
      .from('restaurants')
      .select('*')
      .eq('owner_id', user.id)
      .single();

    if (data) {
      setRestaurant(data);

      const { data: items } = await supabase
        .from('menu_items')
        .select('*')
        .eq('restaurant_id', data.id)
        .order('sort_order', { ascending: true });

      setMenuItems(items || []);
    }

    setIsLoading(false);
  }, [user, isRestaurantOwner, supabase]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  const toggleOpen = useCallback(async () => {
    if (!restaurant) return;
    const nextOpenStatus = !restaurant.is_open;
    const { error } = await supabase.rpc('set_restaurant_open_status', {
      p_restaurant_id: restaurant.id,
      p_is_open: nextOpenStatus,
    });

    if (!error) {
      setRestaurant((prev) => prev ? { ...prev, is_open: nextOpenStatus } : null);
    }
  }, [restaurant, supabase]);

  return {
    restaurant,
    menuItems,
    isLoading,
    toggleOpen,
    refetch: fetchRestaurant,
  };
}
