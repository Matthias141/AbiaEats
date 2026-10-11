"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Minus, Plus, Clock, ShoppingBag, UtensilsCrossed } from "lucide-react";
import type { MenuItem, RestaurantPublic } from "@/types/database";
import { useCart } from "@/contexts/cart-context";
import { formatPrice } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";

interface MenuItemModalProps {
  item: MenuItem | null;
  restaurant: RestaurantPublic;
  onClose: () => void;
}

export function MenuItemModal({
  item,
  restaurant,
  onClose,
}: MenuItemModalProps) {
  const { addItem, removeItem, getItemQuantity } = useCart();
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (item) {
      const existing = getItemQuantity(item.id);
      setQuantity(existing > 0 ? existing : 1);
    }
  }, [item, getItemQuantity]);

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
    <Modal
      isOpen={Boolean(item)}
      onClose={onClose}
      title={item.name}
      variant="bottom-sheet"
    >
      <div>
        {/* Image */}
        <div className="aspect-[16/10] bg-gray-50 relative overflow-hidden">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50">
              <UtensilsCrossed
                className="w-16 h-16 text-brand-orange/50"
                strokeWidth={1.5}
                aria-hidden="true"
              />
            </div>
          )}
          {item.is_popular && (
            <div className="absolute top-4 left-4 px-3 py-1 rounded-full gradient-orange text-white text-xs font-medium">
              Popular
            </div>
          )}
        </div>

        {/* Content */}
        <div className="pt-5 pb-6">
          <div className="flex items-center gap-3 mt-2">
            <span className="font-mono text-xl font-bold text-brand-orange-dark">
              {formatPrice(item.price)}
            </span>
            <span className="flex items-center gap-1 text-xs text-gray-600">
              <Clock className="w-3.5 h-3.5" />
              {restaurant.min_delivery_time}-{restaurant.max_delivery_time} min
              delivery
            </span>
          </div>

          {item.description && (
            <p className="mt-4 text-sm text-gray-500 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Delivery info */}
          <div className="mt-6 p-4 rounded-2xl liquid-glass-soft">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Delivery fee</span>
              <span className="font-medium text-gray-900">
                {formatPrice(restaurant.delivery_fee)}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mt-2">
              <span className="text-gray-500">From</span>
              <span className="font-medium text-gray-900">
                {restaurant.name}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="sticky bottom-0 border-t border-gray-200 bg-white pt-4 safe-bottom">
        <div className="flex flex-wrap items-center gap-3">
          {/* Quantity controls */}
          <div className="flex items-center gap-3 liquid-chip rounded-xl px-3 py-2">
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={quantity === 1}
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="size-11 rounded-lg border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors active:scale-95"
            >
              <Minus className="w-4 h-4 text-gray-600" />
            </button>
            <span className="font-mono text-sm w-6 text-center font-semibold text-gray-900">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={quantity === 20}
              onClick={() => setQuantity((q) => Math.min(20, q + 1))}
              className="size-11 rounded-lg gradient-orange flex items-center justify-center text-white active:scale-95"
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
              {existingQty > 0 ? "Update" : "Add"} —{" "}
              {formatPrice(item.price * quantity)}
            </span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
