'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { OrderWithDetails, OrderStatus } from '@/types/database';

interface UseOrdersOptions {
  status?: OrderStatus[];
  restaurantId?: string;
  realtime?: boolean;
}

export function useOrders(options: UseOrdersOptions = {}) {
  const { status, restaurantId, realtime = true } = options;
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

    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        () => {
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, fetchOrders, realtime]);

  return { orders, isLoading, error, refetch: fetchOrders };
}
