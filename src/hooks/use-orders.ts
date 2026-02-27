'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { OrderWithDetails, OrderStatus } from '@/types/database';

interface UseOrdersOptions {
  status?: OrderStatus[];
  restaurantId?: string;
  /** Scope Realtime events to a specific customer. Pass the authenticated user's ID. */
  userId?: string;
  realtime?: boolean;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { status, restaurantId, userId, realtime = true } = options;
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchOrders = useCallback(async () => {
    let query = supabase
      .from('orders')
      .select('*, order_items(*), restaurants(name, phone, image_url, address)')
      .order('created_at', { ascending: false });

    if (status && status.length > 0) {
      query = query.in('status', status);
    }

    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }

    const { data, error: fetchError } = await query;

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setOrders(data as OrderWithDetails[]);
    }
    setIsLoading(false);
  }, [supabase, status, restaurantId]);

  useEffect(() => {
    fetchOrders();

    if (!realtime) return;

    // Build a server-side filter for the Realtime channel so Supabase only
    // broadcasts changes relevant to this subscriber. Without a filter the
    // channel fires on every order row change on the entire table, leaking
    // metadata (not data — RLS still gates the actual fetch) and wasting
    // bandwidth. Priority: restaurantId > userId > no filter (admin).
    const filter = restaurantId
      ? `restaurant_id=eq.${restaurantId}`
      : userId
      ? `customer_id=eq.${userId}`
      : undefined;

    // Use a unique channel name so multiple hook instances don't share state
    const channelName = restaurantId
      ? `orders-restaurant-${restaurantId}`
      : userId
      ? `orders-customer-${userId}`
      : 'orders-admin';

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          ...(filter ? { filter } : {}),
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchOrders, realtime, restaurantId, userId]);

  return { orders, isLoading, error, refetch: fetchOrders };
}
