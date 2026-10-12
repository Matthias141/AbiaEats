"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Minus, Plus, Clock, ShoppingBag } from "lucide-react";
import type { MenuItem, RestaurantPublic } from "@/types/database";
import { useCart } from "@/contexts/cart-context";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/primitives/button";
import { Badge } from "@/components/ui/primitives/badge";
import { CuisineIcon } from "@/lib/cuisine-icons";
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
      className="customer-dialog"
    >
      <div>
        {/* Image */}
        <div className="aspect-[16/10] rounded-2xl bg-gray-50 relative overflow-hidden">
          {item.image_url ? (
            <Image
              src={item.image_url}
              alt={item.name}
              fill
              sizes="100vw"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 bg-muted"><CuisineIcon tags={restaurant.cuisine_tags} className="size-24" /><span className="text-sm text-muted-foreground">Photo coming soon</span></div>
          )}
          {item.is_popular && (
            <Badge variant="secondary" className="absolute top-4 left-4">
              Popular
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="pt-5 pb-6">
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="tabular-nums text-xl font-semibold text-foreground">
              {formatPrice(item.price)}
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              {restaurant.min_delivery_time}–{restaurant.max_delivery_time} min
              delivery
            </span>
          </div>

          {item.description && (
            <p className="mt-4 text-sm text-gray-500 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Delivery info */}
          <div className="mt-6 flex flex-col gap-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Delivery fee</span>
              <span className="font-medium text-gray-900">
                {formatPrice(restaurant.delivery_fee)}
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm mt-2">
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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Quantity controls */}
          <div className="flex items-center justify-between gap-3 rounded-full border border-gray-200 bg-gray-50 px-2 py-1.5">
            <Button variant="ghost" size="icon" className="rounded-full bg-white" aria-label="Decrease quantity" disabled={quantity === 1} onClick={() => setQuantity(q => Math.max(1, q - 1))}><Minus aria-hidden="true" /></Button>
            <span className="w-6 text-center tabular-nums font-semibold" aria-live="polite">{quantity}</span>
            <Button variant="ghost" size="icon" className="rounded-full bg-white" aria-label="Increase quantity" disabled={quantity === 20} onClick={() => setQuantity(q => Math.min(20, q + 1))}><Plus aria-hidden="true" /></Button>
          </div>

          {/* Add to cart button */}
          <Button onClick={handleAddToCart} disabled={!restaurant.is_open} className="flex-1 rounded-full">
            <ShoppingBag data-icon="inline-start" aria-hidden="true" />
            <span>{existingQty > 0 ? "Update cart" : "Add to cart"} — <span className="tabular-nums">{formatPrice(item.price * quantity)}</span></span>
          </Button>
        </div>
      </div>
    </Modal>
  );
}
