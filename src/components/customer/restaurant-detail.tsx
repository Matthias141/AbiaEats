"use client";

import { useState, useMemo, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Star,
  Clock,
  MapPin,
  Plus,
  ShoppingBag,
  Share2,
  ClipboardList,
} from "lucide-react";
import type { RestaurantPublic, MenuItem } from "@/types/database";
import { useCart } from "@/contexts/cart-context";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/primitives/button";
import { Badge } from "@/components/ui/primitives/badge";
import { CuisineIcon } from "@/lib/cuisine-icons";
import { MenuItemModal } from "@/components/customer/menu-item-modal";
import { RestaurantSwitchModal } from "@/components/customer/restaurant-switch-modal";

interface RestaurantDetailProps {
  restaurant: RestaurantPublic;
  menuItems: MenuItem[];
}

export function RestaurantDetail({
  restaurant,
  menuItems,
}: RestaurantDetailProps) {
  const {
    addItem,
    getItemQuantity,
    needsRestaurantSwitch,
    itemCount,
    subtotal,
    deliveryFee,
  } = useCart();

  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [pendingItem, setPendingItem] = useState<MenuItem | null>(null);

  const categoryRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const tabsRef = useRef<HTMLDivElement>(null);
  const tabButtonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const isManualScroll = useRef(false);

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

  const categoryNames = useMemo(
    () => Array.from(categories.keys()),
    [categories],
  );

  // Set initial active category
  useEffect(() => {
    if (categoryNames.length > 0 && !activeCategory) {
      setActiveCategory(categoryNames[0]);
    }
  }, [categoryNames, activeCategory]);

  // Scroll active tab into view (horizontal only — never scroll the page)
  useEffect(() => {
    if (activeCategory && tabsRef.current) {
      const btn = tabButtonRefs.current.get(activeCategory);
      if (btn) {
        const container = tabsRef.current;
        const scrollLeft =
          btn.offsetLeft - container.offsetWidth / 2 + btn.offsetWidth / 2;
        container.scrollTo({ left: scrollLeft, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
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
            if (entry.isIntersecting && !isManualScroll.current) {
              setActiveCategory(category);
            }
          });
        },
        { rootMargin: "-120px 0px -60% 0px", threshold: 0 },
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, [categoryNames]);

  const scrollToCategory = useCallback((category: string, animate = true) => {
    // Suppress observer updates during programmatic scroll
    isManualScroll.current = true;
    setActiveCategory(category);
    const el = categoryRefs.current.get(category);
    if (el) {
      const yOffset = -120;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: !animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    }
    // Re-enable observer after scroll animation settles
    setTimeout(() => {
      isManualScroll.current = false;
    }, 800);
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
        restaurant.delivery_fee,
      );
    },
    [restaurant, needsRestaurantSwitch, addItem],
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
    [restaurant.id, needsRestaurantSwitch],
  );

  const handleSwitchConfirm = useCallback(() => {
    setShowSwitchModal(false);
    if (pendingItem) {
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
        restaurant.delivery_fee,
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
    <main
      id="main-content"
      tabIndex={-1}
      className={`min-h-screen liquid-surface overflow-x-hidden ${itemCount > 0 ? "pb-56" : "pb-28"}`}
    >
      {/* Hero Section */}
      <div className="relative">
        {/* Cover Image */}
        <div className="relative h-52 overflow-hidden bg-gray-100 sm:h-72 lg:h-80">
          {restaurant.cover_image_url || restaurant.image_url ? (
            <Image
              src={restaurant.cover_image_url || restaurant.image_url || ""}
              alt={restaurant.name}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 via-amber-50 to-orange-50 flex items-center justify-center">
              <CuisineIcon
                tags={restaurant.cuisine_tags}
                className="w-20 h-20 text-brand-orange/40"
              />
            </div>
          )}
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-white" />
        </div>

        {/* Navigation overlays */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-20">
          <Link
            href="/restaurants"
            aria-label="Back to restaurants"
            className="size-11 rounded-xl liquid-chip flex items-center justify-center active:scale-[0.97] transition-transform"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <button
            onClick={handleShare}
            aria-label="Share restaurant"
            className="size-11 rounded-xl liquid-chip flex items-center justify-center active:scale-[0.97] transition-transform"
          >
            <Share2 className="w-5 h-5 text-gray-700" />
          </button>
        </div>

        {/* Restaurant info block */}
        <div className="relative z-10 -mt-8 px-4">
          <div className="max-w-2xl mx-auto rounded-3xl border border-gray-200 bg-white p-5 beautiful-sm">
            <div className="flex flex-wrap items-start gap-4">
              {/* Logo */}
              <div className="relative w-14 h-14 rounded-xl liquid-chip overflow-hidden flex-shrink-0 flex items-center justify-center">
                {restaurant.image_url ? (
                  <Image
                    src={restaurant.image_url}
                    alt={restaurant.name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : (
                  <span className="text-xl font-bold text-primary">
                    {restaurant.name.charAt(0)}
                  </span>
                )}
              </div>

              <div className="flex-1 basis-48 min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h1 className="min-w-0 break-words text-xl font-bold text-foreground">
                    {restaurant.name}
                  </h1>
                  {/* Open/Closed badge */}
                  {restaurant.is_open ? (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-50 text-green-800 text-xs font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Open
                    </span>
                  ) : (
                    <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-800 text-xs font-medium">
                      Closed
                    </span>
                  )}
                </div>
                {restaurant.description && (
                  <p className="mt-1 break-words text-sm leading-relaxed text-muted-foreground">
                    {restaurant.description}
                  </p>
                )}

                {/* Stats row */}
                <div className="flex items-center flex-wrap gap-3 mt-2.5">
                  {restaurant.rating_count > 0 && (
                    <span className="flex items-center gap-1 text-sm">
                      <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                      <span className="font-semibold text-gray-900">
                        {restaurant.average_rating.toFixed(1)}
                      </span>
                      <span className="text-muted-foreground">
                        ({restaurant.rating_count})
                      </span>
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <Clock className="w-3.5 h-3.5" />
                    {restaurant.min_delivery_time}-
                    {restaurant.max_delivery_time} min
                  </span>
                  <span className="flex items-center gap-1 text-sm text-gray-500">
                    <MapPin className="w-3.5 h-3.5" />
                    {formatPrice(restaurant.delivery_fee)} delivery
                  </span>
                </div>

                {/* Cuisine tags */}
                {restaurant.cuisine_tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5">
                    {restaurant.cuisine_tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Tabs - Sticky */}
      {categoryNames.length > 0 && (
        <div className="menu-category-bar sticky top-0 z-30 mt-4">
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
                aria-pressed={activeCategory === category}
                onClick={event => scrollToCategory(category, event.detail !== 0)}
                className={`
                  flex-shrink-0 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors
                  border-b-2 min-h-[44px]
                  ${
                    activeCategory === category
                      ? "text-primary border-primary"
                      : "text-muted-foreground border-transparent"
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
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {category}
              </h3>

              {/* 2-column grid */}
              <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
                {items.map((item) => {
                  const qty = getItemQuantity(item.id);
                  return (
                    <article
                      key={item.id}
                      className="menu-product relative overflow-hidden rounded-3xl bg-white"
                    >
                      <button
                        type="button"
                        onClick={() => handleItemClick(item)}
                        aria-label={`View ${item.name} details`}
                        className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-offset-[-4px]"
                      />
                      {/* Image area */}
                      <div className="relative aspect-[5/4] overflow-hidden bg-gray-50">
                        {item.image_url ? (
                          <Image
                            src={item.image_url}
                            alt={item.name}
                            fill
                            sizes="(max-width: 640px) 50vw, 320px"
                            className="object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="grid h-full grid-rows-[minmax(0,1fr)_auto] bg-[#f3f3ef]">
                            <CuisineIcon
                              tags={restaurant.cuisine_tags}
                              className="m-auto size-16 max-h-full"
                            />
                            <span className="block py-2 pl-3 pr-16 text-xs leading-snug text-muted-foreground">Awaiting photo</span>
                          </div>
                        )}

                        {/* Popular badge */}
                        {item.is_popular && (
                          <Badge variant="secondary" className="absolute top-2 left-2">
                            Popular
                          </Badge>
                        )}

                        {/* Quantity indicator (if in cart) */}
                        {qty > 0 && (
                          <div className="absolute top-2 right-2 flex size-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-bold tabular-nums">
                            {qty}
                          </div>
                        )}

                        {/* Add button overlay */}
                        <Button size="icon" disabled={!restaurant.is_open} onClick={event => { event.stopPropagation(); handleAddItem(item); }} className="absolute bottom-2 right-2 z-20 rounded-full" aria-label={`Add ${item.name} to cart`}>
                          <Plus aria-hidden="true" />
                        </Button>
                      </div>

                      {/* Text content */}
                      <div className="p-3">
                        <h4 className="break-words text-[15px] font-medium leading-relaxed text-foreground">
                          {item.name}
                        </h4>
                        <p className="tabular-nums text-sm font-medium text-foreground mt-1.5">
                          {formatPrice(item.price)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-20">
            <ClipboardList
              className="w-14 h-14 text-gray-300 mx-auto mb-4"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Menu coming soon
            </h3>
            <p className="text-sm text-gray-500 max-w-xs mx-auto">
              This restaurant hasn&apos;t added menu items yet. Check back
              later!
            </p>
            <Link
              href="/restaurants"
              className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:border-gray-300 active:scale-[0.97] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Browse other restaurants
            </Link>
          </div>
        )}
      </div>

      {/* Floating Cart Bar */}
      {itemCount > 0 && (
        <div className="menu-cart-bar fixed left-0 right-0 z-40 px-4">
          <div className="max-w-2xl mx-auto">
            <Link href="/cart">
              <div className="w-full min-h-[52px] flex flex-wrap items-center justify-between gap-3 px-5 py-3 rounded-2xl bg-gray-900 text-white font-medium beautiful-md active:scale-[0.97] transition-transform cursor-pointer">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <ShoppingBag className="w-5 h-5" />
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-white text-brand-orange text-[10px] font-bold flex items-center justify-center">
                      {itemCount}
                    </span>
                  </div>
                  <span>View Cart</span>
                </div>
                <span className="min-w-0 break-words text-right tabular-nums font-semibold">
                  {formatPrice(cartTotal)}
                </span>
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
    </main>
  );
}
