'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import type { CartItem } from '@/types/database';

interface CartState {
  restaurant_id: string | null;
  restaurant_name: string | null;
  delivery_fee: number;
  items: CartItem[];
}

interface CartContextType {
  items: CartItem[];
  restaurantId: string | null;
  restaurantName: string | null;
  deliveryFee: number;
  subtotal: number;
  total: number;
  itemCount: number;
  addItem: (item: CartItem, restaurantName: string, deliveryFee: number) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  clearCart: () => void;
  getItemQuantity: (menuItemId: string) => number;
  needsRestaurantSwitch: (restaurantId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'abiaeats_cart';

function loadCart(): CartState {
  if (typeof window === 'undefined') {
    return { restaurant_id: null, restaurant_name: null, delivery_fee: 0, items: [] };
  }
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return { restaurant_id: null, restaurant_name: null, delivery_fee: 0, items: [] };
}

function saveCart(state: CartState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage errors
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartState>(() => loadCart());

  useEffect(() => {
    saveCart(cart);
  }, [cart]);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setCart(loadCart());
  }, []);

  const addItem = useCallback((item: CartItem, restaurantName: string, deliveryFee: number) => {
    setCart((prev) => {
      // If switching restaurants, clear previous cart
      if (prev.restaurant_id && prev.restaurant_id !== item.restaurant_id) {
        return {
          restaurant_id: item.restaurant_id,
          restaurant_name: restaurantName,
          delivery_fee: deliveryFee,
          items: [{ ...item, quantity: 1 }],
        };
      }

      const existing = prev.items.find((c) => c.menu_item_id === item.menu_item_id);
      if (existing) {
        if (existing.quantity >= 20) return prev;
        return {
          ...prev,
          items: prev.items.map((c) =>
            c.menu_item_id === item.menu_item_id ? { ...c, quantity: c.quantity + 1 } : c
          ),
        };
      }

      return {
        restaurant_id: item.restaurant_id,
        restaurant_name: restaurantName,
        delivery_fee: deliveryFee,
        items: [...prev.items, { ...item, quantity: 1 }],
      };
    });
  }, []);

  const removeItem = useCallback((menuItemId: string) => {
    setCart((prev) => {
      const existing = prev.items.find((c) => c.menu_item_id === menuItemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        const newItems = prev.items.filter((c) => c.menu_item_id !== menuItemId);
        if (newItems.length === 0) {
          return { restaurant_id: null, restaurant_name: null, delivery_fee: 0, items: [] };
        }
        return { ...prev, items: newItems };
      }
      return {
        ...prev,
        items: prev.items.map((c) =>
          c.menu_item_id === menuItemId ? { ...c, quantity: c.quantity - 1 } : c
        ),
      };
    });
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    setCart((prev) => {
      if (quantity <= 0) {
        const newItems = prev.items.filter((c) => c.menu_item_id !== menuItemId);
        if (newItems.length === 0) {
          return { restaurant_id: null, restaurant_name: null, delivery_fee: 0, items: [] };
        }
        return { ...prev, items: newItems };
      }
      if (quantity > 20) return prev;
      return {
        ...prev,
        items: prev.items.map((c) =>
          c.menu_item_id === menuItemId ? { ...c, quantity } : c
        ),
      };
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart({ restaurant_id: null, restaurant_name: null, delivery_fee: 0, items: [] });
  }, []);

  const getItemQuantity = useCallback(
    (menuItemId: string) => {
      return cart.items.find((c) => c.menu_item_id === menuItemId)?.quantity || 0;
    },
    [cart.items]
  );

  const needsRestaurantSwitch = useCallback(
    (restaurantId: string) => {
      return cart.restaurant_id !== null && cart.restaurant_id !== restaurantId && cart.items.length > 0;
    },
    [cart.restaurant_id, cart.items.length]
  );

  const subtotal = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart.items]
  );

  const total = useMemo(() => subtotal + cart.delivery_fee, [subtotal, cart.delivery_fee]);

  const itemCount = useMemo(
    () => cart.items.reduce((sum, item) => sum + item.quantity, 0),
    [cart.items]
  );

  const value: CartContextType = {
    items: cart.items,
    restaurantId: cart.restaurant_id,
    restaurantName: cart.restaurant_name,
    deliveryFee: cart.delivery_fee,
    subtotal,
    total,
    itemCount,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    getItemQuantity,
    needsRestaurantSwitch,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
