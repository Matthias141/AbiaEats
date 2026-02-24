'use client';

import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Star, Clock, MapPin, Plus, ShoppingBag, Share2 } from 'lucide-react';
import type { Restaurant, MenuItem } from '@/types/database';
import { useCart } from '@/contexts/cart-context';
import { formatPrice } from '@/lib/utils';
import { MenuItemModal } from '@/components/customer/menu-item-modal';
import { RestaurantSwitchModal } from '@/components/customer/restaurant-switch-modal';

interface RestaurantDetailProps {
  restaurant: Restaurant;
  menuItems: MenuItem[];
}

export function RestaurantDetail({ restaurant, menuItems }: RestaurantDetailProps) {
  const {
    addItem,
    getItemQuantity,
    needsRestaurantSwitch,
    itemCount,
    subtotal,
    deliveryFee,
  } = useCart();

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null);

  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  // Build categories from available menu items, preserving sort_order
  const categories = useMemo(() => {
    const cats = new Map<string, MenuItem[]>();
    const available = menuItems.filter((item) => item.is_available);
    available
      .sort((a, b) => a.sort_order - b.sort_order)
      .forEach((item) => {
        const existing = cats.get(item.category) || [];
        existing.push(item);
        cats.set(item.category, existing);
      });
    return cats;
  }, [menuItems]);

  const categoryNames = useMemo(() => Array.from(categories.keys()), [categories]);

  // Set initial active category
  useEffect(() => {
    if (categoryNames.length > 0 && !activeCategory) {
      setActiveCategory(categoryNames[0]);
    }
  }, [categoryNames, activeCategory]);

  // Scroll active tab into view
  useEffect(() => {
    if (activeCategory && tabsRef.current) {
      const btn = tabButtonRefs.current.get(activeCategory);
      if (btn) {
        btn.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'center',
        });
      }
    }
  }, [activeCategory]);

  // Intersection Observer for category sections
  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    categoryRefs.current.forEach((el, category) => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              setActiveCategory(category);
            }
          });
        },
        { rootMargin: '-120px 0px -60% 0px', threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, [categoryNames]);

  const scrollToCategory = useCallback((category: string) => {
    setActiveCategory(category);
    const el = categoryRefs.current.get(category);
    if (el) {
      const yOffset = -120;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  }, []);

  const handleAddItem = useCallback(
    (item: MenuItem) => {
      if (needsRestaurantSwitch(restaurant.id)) {
        setPendingItem(item);
        setShowSwitchModal(true);
        return;
      }

      addItem(
        {
          menu_item_id: item.id,
          restaurant_id: restaurant.id,
          name: item.name,
          price: item.price,
          quantity: 1,
          image_url: item.image_url,
        },
        restaurant.name,
        restaurant.delivery_fee
      );
    },
    [restaurant, needsRestaurantSwitch, addItem]
  );

  const handleItemClick = useCallback(
    (item: MenuItem) => {
      if (needsRestaurantSwitch(restaurant.id)) {
        setPendingItem(item);
        setShowSwitchModal(true);
        return;
      }
      setSelectedItem(item);
    },
    [restaurant.id, needsRestaurantSwitch]
  );

  const handleSwitchConfirm = useCallback(() => {
    setShowSwitchModal(false);
    if (pendingItem) {
      // After clearing, add item or open modal
      addItem(
        {
          menu_item_id: pendingItem.id,
          restaurant_id: restaurant.id,
          name: pendingItem.name,
          price: pendingItem.price,
          quantity: 1,
          image_url: pendingItem.image_url,
        },
        restaurant.name,
        restaurant.delivery_fee
      );
      setPendingItem(null);
    }
  }, [pendingItem, restaurant, addItem]);

  const handleSwitchCancel = useCallback(() => {
    setShowSwitchModal(false);
    setPendingItem(null);
  }, []);

  const handleShare = useCallback(async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: restaurant.name,
          text: `Check out ${restaurant.name} on AbiaEats!`,
          url: window.location.href,
        });
      } catch {
        // User cancelled or share failed silently
      }
    } else {
      try {
        await navigator.clipboard.writeText(window.location.href);
      } catch {
        // Clipboard write failed silently
      }
    }
  }, [restaurant.name]);

  const cartTotal = subtotal + deliveryFee;

  return (
    <div className="min-h-screen bg-dark-bg overflow-x-hidden pb-24">
      {/* Hero Section */}
      <div className="relative">
        {/* Cover Image */}
        <div className="aspect-[16/9] relative overflow-hidden bg-dark-card">
          {restaurant.cover_image_url || restaurant.image_url ? (
            <img
              src={restaurant.cover_image_url || restaurant.image_url || ''}
              alt={restaurant.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-brand-orange/20 via-dark-card to-dark-bg" />
          )}
          {/* Gradient overlay: transparent top to dark bottom */}
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-dark-bg" />
        </div>

        {/* Navigation overlays */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-20">
          <Link
            href="/restaurants"
            className="w-10 h-10 rounded-xl backdrop-blur-[16px] bg-black/30 border border-white/10 flex items-center justify-center active:scale-[0.97] transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Link>
          <button
            onClick={handleShare}
            className="w-10 h-10 rounded-xl backdrop-blur-[16px] bg-black/30 border border-white/10 flex items-center justify-center active:scale-[0.97] transition-transform"
          >
            <Share2 className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Restaurant info block overlapping hero */}
        <div className="relative z-10 -mt-8 px-4">
          <div className="max-w-2xl mx-auto">
            {/* Logo */}
            <div className="w-16 h-16 rounded-2xl bg-dark-card border-2 border-dark-border overflow-hidden shadow-lg flex-shrink-0">
              {restaurant.image_url ? (
                <img
                  src={restaurant.image_url}
                  alt={restaurant.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-brand-orange/20 to-dark-card">
                  <span className="text-2xl font-heading font-bold text-brand-orange">
                    {restaurant.name.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Name and description */}
            <h1 className="font-heading text-2xl font-bold mt-3">{restaurant.name}</h1>
            {restaurant.description && (
              <p className="text-sm text-foreground/50 mt-1 leading-relaxed">
                {restaurant.description}
              </p>
            )}

            {/* Stats row */}
            <div className="flex items-center flex-wrap gap-4 mt-3">
              {restaurant.rating_count > 0 && (
                <span className="flex items-center gap-1.5 text-sm text-success font-medium">
                  <Star className="w-4 h-4 fill-current" />
                  {restaurant.average_rating.toFixed(1)}
                  <span className="text-foreground/40 font-normal">
                    ({restaurant.rating_count})
                  </span>
                </span>
              )}
              <span className="flex items-center gap-1.5 text-sm text-foreground/60">
                <Clock className="w-4 h-4" />
                {restaurant.min_delivery_time}-{restaurant.max_delivery_time} min
              </span>
              <span className="flex items-center gap-1.5 text-sm text-foreground/60">
                <MapPin className="w-4 h-4" />
                {formatPrice(restaurant.delivery_fee)} delivery
              </span>
            </div>

            {/* Cuisine tags */}
            {restaurant.cuisine_tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {restaurant.cuisine_tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 rounded-full bg-brand-orange/10 text-brand-orange text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Open/Closed badge */}
            {!restaurant.is_open && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-error/10 text-error text-xs font-medium border border-error/20">
                <span className="w-1.5 h-1.5 rounded-full bg-error" />
                Currently Closed
              </div>
            )}
            {restaurant.is_open && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-medium border border-success/20">
                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-soft" />
                Open Now
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Category Tabs - Sticky */}
      {categoryNames.length > 0 && (
        <div className="sticky top-0 z-30 bg-dark-bg/95 backdrop-blur-xl border-b border-dark-border/50 mt-6">
          <div
            ref={tabsRef}
            className="max-w-2xl mx-auto flex overflow-x-auto no-scrollbar px-4 gap-1"
          >
            {categoryNames.map((category) => (
              <button
                key={category}
                ref={(el) => {
                  if (el) tabButtonRefs.current.set(category, el);
                }}
                onClick={() => scrollToCategory(category)}
                className={`
                  flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
                  border-b-2 min-h-[44px]
                  ${
                    activeCategory === category
                      ? 'text-brand-orange border-brand-orange'
                      : 'text-foreground/40 border-transparent hover:text-foreground/60'
                  }
                `}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Menu Content */}
      <div className="max-w-2xl mx-auto px-4 mt-6">
        {menuItems.length > 0 ? (
          Array.from(categories.entries()).map(([category, items]) => (
            <div
              key={category}
              ref={(el) => {
                if (el) categoryRefs.current.set(category, el);
              }}
              className="mb-8"
            >
              <h3 className="font-heading text-lg font-semibold text-foreground/80 mb-4">
                {category}
              </h3>

              {/* 2-column grid */}
              <div className="grid grid-cols-2 gap-3">
                {items.map((item) => {
                  const qty = getItemQuantity(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleItemClick(item)}
                      className="rounded-2xl bg-dark-card border border-dark-border overflow-hidden cursor-pointer hover:border-dark-border-light transition-all active:scale-[0.97]"
                    >
                      {/* Image area */}
                      <div className="relative aspect-square overflow-hidden bg-dark-border/20">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-dark-card to-dark-border/30">
                            <span className="text-4xl opacity-30">🍽️</span>
                          </div>
                        )}

                        {/* Popular badge */}
                        {item.is_popular && (
                          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full gradient-orange text-white text-[10px] font-semibold shadow-md">
                            Popular
                          </div>
                        )}

                        {/* Quantity indicator (if in cart) */}
                        {qty > 0 && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-brand-orange text-white text-xs font-bold flex items-center justify-center shadow-md">
                            {qty}
                          </div>
                        )}

                        {/* Add button overlay */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddItem(item);
                          }}
                          className="absolute bottom-2 right-2 w-8 h-8 rounded-full gradient-orange text-white flex items-center justify-center shadow-lg shadow-brand-orange/30 active:scale-[0.90] transition-transform"
                          aria-label={`Add ${item.name} to cart`}
                        >
                          <Plus className="w-4 h-4" strokeWidth={3} />
                        </button>
                      </div>

                      {/* Text content */}
                      <div className="p-3">
                        <h4 className="text-sm font-medium leading-tight line-clamp-2 min-h-[2.5rem]">
                          {item.name}
                        </h4>
                        <p className="font-mono text-sm font-semibold text-brand-orange mt-1.5">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20">
            <div className="text-6xl mb-4 opacity-60">📋</div>
            <h3 className="font-heading text-xl font-semibold mb-2">
              Menu coming soon
            </h3>
            <p className="text-sm text-foreground/50 max-w-xs mx-auto">
              This restaurant hasn&apos;t added menu items yet. Check back later!
            </p>
            <Link
              href="/restaurants"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl border border-dark-border text-sm font-medium hover:border-dark-border-light active:scale-[0.97] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Browse other restaurants
            </Link>
          </div>
        )}
      </div>

      {/* Floating Cart Bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-dark-bg/90 backdrop-blur-xl border-t border-dark-border safe-bottom">
          <div className="max-w-2xl mx-auto">
            <Link href="/cart">
              <div className="w-full min-h-[52px] flex items-center justify-between gap-3 px-5 py-3 rounded-2xl gradient-orange text-white font-medium shadow-lg shadow-brand-orange/25 active:scale-[0.97] transition-transform cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingBag className="w-5 h-5" />
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-brand-orange text-[10px] font-bold flex items-center justify-center">
                      {itemCount}
                    </span>
                  </div>
                  <span>View Cart</span>
                </div>
                <span className="font-mono font-bold">{formatPrice(cartTotal)}</span>
              </div>
            </Link>
          </div>
        </div>
      )}

      {/* Menu Item Modal */}
      <MenuItemModal
        item={selectedItem}
        restaurant={restaurant}
        onClose={() => setSelectedItem(null)}
      />

      {/* Restaurant Switch Modal */}
      {showSwitchModal && (
        <RestaurantSwitchModal
          newRestaurantName={restaurant.name}
          onConfirm={handleSwitchConfirm}
          onCancel={handleSwitchCancel}
        />
      )}
    </div>
  );
}
