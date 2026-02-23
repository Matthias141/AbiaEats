'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, Clock, MapPin, Minus, Plus, ShoppingBag, Utensils } from 'lucide-react';
import type { Restaurant, MenuItem, CartItem } from '@/types/database';
import { formatPrice } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  menuItems: MenuItem[];
}

export function RestaurantDetail({ restaurant, menuItems }: RestaurantDetailProps) {
  const [cart, setCart] = useState<CartItem[]>([]);

  const categories = useMemo(() => {
    const cats = new Map<string, MenuItem[]>();
    menuItems.forEach((item) => {
      const existing = cats.get(item.category) || [];
      existing.push(item);
      cats.set(item.category, existing);
    });
    return cats;
  }, [menuItems]);

  const cartTotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart]
  );

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) {
        if (existing.quantity >= 20) return prev;
        return prev.map((c) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        {
          menu_item_id: item.id,
          restaurant_id: restaurant.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          image_url: item.image_url,
        },
      ];
    });
  };

  const removeFromCart = (menuItemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === menuItemId);
      if (!existing) return prev;
      if (existing.quantity <= 1) {
        return prev.filter((c) => c.menu_item_id !== menuItemId);
      }
      return prev.map((c) =>
        c.menu_item_id === menuItemId ? { ...c, quantity: c.quantity - 1 } : c
      );
    });
  };

  const getItemQuantity = (menuItemId: string) => {
    return cart.find((c) => c.menu_item_id === menuItemId)?.quantity || 0;
  };

  return (
    <div className="min-h-screen bg-dark-bg overflow-x-hidden pb-24">
      {/* Header */}
      <div className="sticky top-0 z-40 border-b border-dark-border/50 backdrop-blur-xl bg-dark-bg/80">
        <div className="max-w-2xl mx-auto px-4 h-16 flex items-center gap-3">
          <Link
            href="/restaurants"
            className="tap-target w-10 h-10 rounded-xl bg-dark-card border border-dark-border flex items-center justify-center hover:border-dark-border-light transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="font-heading text-lg font-bold truncate">{restaurant.name}</h1>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Restaurant Info Card */}
        <div className="mt-6 p-5 rounded-2xl bg-dark-card border border-dark-border">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-xl bg-dark-border/30 flex items-center justify-center flex-shrink-0 overflow-hidden">
              {restaurant.image_url ? (
                <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" />
              ) : (
                <Utensils className="w-6 h-6 text-foreground/20" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-heading text-xl font-bold">{restaurant.name}</h2>
              {restaurant.description && (
                <p className="text-sm text-foreground/50 mt-1">{restaurant.description}</p>
              )}
              <div className="flex items-center flex-wrap gap-3 mt-3 text-xs text-foreground/50">
                {restaurant.rating_count > 0 && (
                  <span className="flex items-center gap-1 text-green-500">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    {restaurant.average_rating.toFixed(1)} ({restaurant.rating_count})
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {restaurant.min_delivery_time}-{restaurant.max_delivery_time} min
                </span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {restaurant.city === 'aba' ? 'Aba' : 'Umuahia'}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {restaurant.cuisine_tags.map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange text-xs">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-dark-border flex items-center justify-between text-sm">
            <span className="text-foreground/50">Delivery fee</span>
            <span className="font-medium">{formatPrice(restaurant.delivery_fee)}</span>
          </div>
        </div>

        {/* Menu */}
        <div className="mt-8">
          {menuItems.length > 0 ? (
            Array.from(categories.entries()).map(([category, items]) => (
              <div key={category} className="mb-8">
                <h3 className="font-heading text-lg font-semibold mb-4 text-foreground/80">
                  {category}
                </h3>
                <div className="space-y-3">
                  {items.map((item) => {
                    const qty = getItemQuantity(item.id);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-dark-card border border-dark-border hover:border-dark-border-light transition-all"
                      >
                        {/* Image */}
                        <div className="w-20 h-20 rounded-xl bg-dark-border/30 flex-shrink-0 overflow-hidden flex items-center justify-center">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" loading="lazy" />
                          ) : (
                            <span className="text-2xl">🍽️</span>
                          )}
                        </div>

                        {/* Details */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h4 className="font-medium text-sm">{item.name}</h4>
                              {item.description && (
                                <p className="text-xs text-foreground/40 mt-0.5 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                              {item.is_popular && (
                                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange text-[10px] font-medium">
                                  Popular
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-2">
                            <span className="font-mono text-sm font-semibold text-brand-orange">
                              {formatPrice(item.price)}
                            </span>

                            {/* Add/Remove buttons */}
                            {qty > 0 ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => removeFromCart(item.id)}
                                  className="tap-target w-8 h-8 rounded-lg border border-dark-border-light flex items-center justify-center hover:bg-dark-border transition-colors active:scale-[0.95]"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="font-mono text-sm w-5 text-center">{qty}</span>
                                <button
                                  onClick={() => addToCart(item)}
                                  className="tap-target w-8 h-8 rounded-lg gradient-orange flex items-center justify-center text-white active:scale-[0.95]"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(item)}
                                className="tap-target px-4 py-1.5 rounded-lg border border-brand-orange/30 text-brand-orange text-xs font-medium hover:bg-brand-orange/10 transition-colors active:scale-[0.97]"
                              >
                                Add
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-16">
              <div className="text-5xl mb-4">📋</div>
              <h3 className="font-heading text-lg font-semibold mb-2">Menu coming soon</h3>
              <p className="text-sm text-foreground/50">
                This restaurant hasn&apos;t added menu items yet.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Cart Bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-dark-bg/90 backdrop-blur-xl border-t border-dark-border">
          <div className="max-w-2xl mx-auto">
            <Link href={`/order/checkout?restaurant=${restaurant.id}`}>
              <Button className="w-full" size="lg">
                <ShoppingBag className="w-5 h-5" />
                <span>
                  View Cart ({cartCount} item{cartCount !== 1 ? 's' : ''})
                </span>
                <span className="ml-auto font-mono">
                  {formatPrice(cartTotal + restaurant.delivery_fee)}
                </span>
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
