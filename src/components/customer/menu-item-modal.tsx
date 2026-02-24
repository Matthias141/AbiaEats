'use client';

import { useState, useEffect } from 'react';
import { X, Minus, Plus, Clock, ShoppingBag } from 'lucide-react';
import type { MenuItem, Restaurant } from '@/types/database';
import { useCart } from '@/contexts/cart-context';
import { formatPrice } from '@/lib/utils';

interface MenuItemModalProps {
  item: MenuItem | null;
  restaurant: Restaurant;
  onClose: () => void;
}

export function MenuItemModal({ item, restaurant, onClose }: MenuItemModalProps) {
  const { addItem, removeItem, getItemQuantity } = useCart();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item) {
      const existing = getItemQuantity(item.id);
      setQuantity(existing > 0 ? existing : 1);
    }
  }, [item, getItemQuantity]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (item) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [item]);

  if (!item) return null;

  const existingQty = getItemQuantity(item.id);

  const handleAddToCart = () => {
    const cartItem = {
      menu_item_id: item.id,
      restaurant_id: restaurant.id,
      name: item.name,
      price: item.price,
      quantity,
      image_url: item.image_url,
    };

    // If increasing quantity, add difference
    if (existingQty > 0) {
      // Remove existing and re-add with new quantity
      for (let i = 0; i < existingQty; i++) {
        removeItem(item.id);
      }
    }
    for (let i = 0; i < quantity; i++) {
      addItem(cartItem, restaurant.name, restaurant.delivery_fee);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 max-h-[90vh] bg-dark-bg rounded-t-3xl overflow-hidden animate-slide-up-sheet">
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-dark-border-light" />
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-dark-card/80 backdrop-blur-sm border border-dark-border flex items-center justify-center"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="overflow-y-auto max-h-[85vh] custom-scrollbar">
          {/* Image */}
          <div className="aspect-[16/10] bg-dark-card relative overflow-hidden">
            {item.image_url ? (
              <img
                src={item.image_url}
                alt={item.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-card to-dark-border/50">
                <span className="text-7xl">🍽️</span>
              </div>
            )}
            {item.is_popular && (
              <div className="absolute top-4 left-4 px-3 py-1 rounded-full gradient-orange text-white text-xs font-medium">
                Popular
              </div>
            )}
          </div>

          {/* Content */}
          <div className="px-5 pt-5 pb-32">
            <h2 className="font-heading text-2xl font-bold">{item.name}</h2>

            <div className="flex items-center gap-3 mt-2">
              <span className="font-mono text-xl font-bold text-brand-orange">
                {formatPrice(item.price)}
              </span>
              <span className="flex items-center gap-1 text-xs text-foreground/40">
                <Clock className="w-3.5 h-3.5" />
                {restaurant.min_delivery_time}-{restaurant.max_delivery_time} min delivery
              </span>
            </div>

            {item.description && (
              <p className="mt-4 text-sm text-foreground/60 leading-relaxed">
                {item.description}
              </p>
            )}

            {/* Delivery info */}
            <div className="mt-6 p-4 rounded-2xl bg-dark-card border border-dark-border">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground/50">Delivery fee</span>
                <span className="font-medium">{formatPrice(restaurant.delivery_fee)}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-foreground/50">From</span>
                <span className="font-medium">{restaurant.name}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="absolute bottom-0 left-0 right-0 p-5 bg-dark-bg/95 backdrop-blur-xl border-t border-dark-border safe-bottom">
          <div className="flex items-center gap-4">
            {/* Quantity controls */}
            <div className="flex items-center gap-3 bg-dark-card rounded-xl border border-dark-border px-3 py-2">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-lg border border-dark-border-light flex items-center justify-center hover:bg-dark-border transition-colors active:scale-95"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="font-mono text-sm w-6 text-center font-semibold">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="w-8 h-8 rounded-lg gradient-orange flex items-center justify-center text-white active:scale-95"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Add to cart button */}
            <button
              onClick={handleAddToCart}
              className="flex-1 min-h-[52px] flex items-center justify-center gap-2 rounded-xl gradient-orange text-white font-medium shadow-lg shadow-brand-orange/25 active:scale-[0.97] transition-all"
            >
              <ShoppingBag className="w-5 h-5" />
              <span>
                {existingQty > 0 ? 'Update' : 'Add'} — {formatPrice(item.price * quantity)}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
