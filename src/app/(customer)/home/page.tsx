"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { FoodBanner } from "@/components/customer/food-banner";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  MapPin,
  ShoppingBag,
  UtensilsCrossed,
} from "lucide-react";
import {
  RestaurantCard,
  RestaurantCardSkeleton,
} from "@/components/customer/restaurant-card";
import { Modal } from "@/components/ui/modal";
import { createClient } from "@/lib/supabase/client";
import {
  CITY_OPTIONS,
  filterRestaurants,
  formatCityName,
  normalizeCityValue,
} from "@/lib/discovery";
import { RestaurantSearch, CuisineFilters } from "@/components/customer/discovery-controls";
import { Button } from "@/components/ui/primitives/button";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/primitives/empty";
import { MOCK_RESTAURANTS } from "@/lib/mock-data";
import { useCart } from "@/contexts/cart-context";
import type { RestaurantPublic } from "@/types/database";

const CITY_STORAGE_KEY = "abiaeats_city";

export default function CustomerHomePage() {
  const [restaurants, setRestaurants] = useState<RestaurantPublic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [demo, setDemo] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [city, setCity] = useState("aba");
  const [showCityPicker, setShowCityPicker] = useState(false);
  const { itemCount } = useCart();

  useEffect(() => {
    try {
      const saved = normalizeCityValue(localStorage.getItem(CITY_STORAGE_KEY));
      if (saved) setCity(saved);
    } catch {
      /* City selection also works without browser storage. */
    }
  }, []);

  const fetchRestaurants = useCallback(async () => {
    setLoading(true);
    setError(false);
    setDemo(false);
    try {
      const supabase = createClient();
      const { data, error: queryError } = await supabase
        .from("restaurants_public")
        .select("*")
        .eq("is_active", true)
        .order("total_orders", { ascending: false });
      if (queryError) throw queryError;
      setRestaurants(data || []);
    } catch {
      if (process.env.NODE_ENV !== "production") {
        setRestaurants(MOCK_RESTAURANTS);
        setDemo(true);
      } else {
        setRestaurants([]);
        setError(true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchRestaurants();
  }, [fetchRestaurants]);

  const handleCityChange = (nextCity: string) => {
    setCity(nextCity);
    try {
      localStorage.setItem(CITY_STORAGE_KEY, nextCity);
    } catch {
      /* Storage is optional. */
    }
    setShowCityPicker(false);
  };
  const filtered = useMemo(
    () =>
      filterRestaurants(restaurants, {
        search: searchQuery,
        cuisine: activeCategory,
        city,
      }),
    [restaurants, searchQuery, activeCategory, city],
  );
  const hasFilters = Boolean(searchQuery || activeCategory !== "all");

  return (
    <main id="main-content" className="min-h-screen bg-light-bg pb-28">
      <header className="eats-topbar">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <Link
            href="/"
            className="font-brand text-xl font-semibold tracking-tight sm:text-2xl"
          >
            abia<span className="text-brand-orange-dark">eats</span>
            <span className="text-brand-orange">.</span>
          </Link>
          <button
            type="button"
            onClick={() => setShowCityPicker(true)}
            aria-haspopup="dialog"
            className="flex min-h-11 items-center gap-3 rounded-xl text-left"
          >
            <span className="hidden size-11 items-center justify-center rounded-full bg-gray-100 text-foreground sm:flex">
              <MapPin className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="sr-only text-xs text-gray-600 sm:not-sr-only sm:block">Find food in</span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                {formatCityName(city)}, Abia
                <ChevronDown className="size-4" aria-hidden="true" />
              </span>
            </span>
          </button>
          <Link
            href="/cart"
            aria-label={`View cart, ${itemCount} items`}
            className="premium-icon-button ui-press relative flex size-11 items-center justify-center rounded-full border border-border bg-background text-foreground"
          >
            <ShoppingBag className="size-5" aria-hidden="true" />
            {itemCount > 0 && (
              <span className="absolute -right-1 -top-1 rounded-full bg-brand-orange-dark px-1.5 text-xs text-white">
                {itemCount}
              </span>
            )}
          </Link>
        </div>
      </header>
      <div className="customer-content mx-auto max-w-6xl px-4 pt-5 sm:px-6 sm:pt-8">
        <div className="home-search-intro mb-4">
          <h1 id="home-heading" className="text-[1.75rem] leading-tight tracking-tight sm:text-4xl">Find your next favourite.</h1>
          <div role="search"><RestaurantSearch id="home-search" value={searchQuery} onChange={setSearchQuery} /></div>
        </div>
        <div className="mb-4">
          <FoodBanner headingId="home-feature-heading" headingLevel={2} title={<>A taste<br />of home.</>} description="Jollof, suya and the flavours you know." compact>
          </FoodBanner>
        </div>
        <section aria-label="Filter by cuisine" className="mb-4"><CuisineFilters value={activeCategory} onChange={setActiveCategory} photographic /></section>
        <section
          id="restaurants"
          aria-labelledby="restaurants-heading"
          aria-busy={loading}
          className="scroll-mt-24"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
            <div>
              <h2
                id="restaurants-heading"
                className="text-[1.375rem] font-semibold tracking-tight sm:text-[1.75rem]"
              >
                {hasFilters
                  ? "Find your favourite"
                  : `Discover ${formatCityName(city)}`}
              </h2>
              <p role="status" className="mt-1 text-sm text-gray-600">
                {loading
                  ? "Finding local restaurants…"
                  : `${filtered.length} restaurant${filtered.length === 1 ? "" : "s"} to explore`}
              </p>
            </div>
            <Link
              href={`/restaurants?city=${city}`}
              className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-brand-orange-dark"
            >
              Explore all
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          {demo && (
            <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              Sample restaurants for development. Live availability and prices
              may differ.
            </p>
          )}
          {loading ? (
            <div className="restaurant-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <RestaurantCardSkeleton />
              <RestaurantCardSkeleton />
              <RestaurantCardSkeleton />
            </div>
          ) : error ? (
            <Empty role="alert" className="home-feedback">
              <EmptyHeader><EmptyMedia variant="icon">
              <UtensilsCrossed
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              /></EmptyMedia>
              <EmptyTitle><h3>We couldn’t load restaurants</h3></EmptyTitle>
              <EmptyDescription>Check your connection and try again.</EmptyDescription></EmptyHeader>
              <EmptyContent><Button onClick={() => void fetchRestaurants()} className="rounded-full">
                Try again
              </Button></EmptyContent>
            </Empty>
          ) : filtered.length ? (
            <div className="restaurant-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          ) : (
            <Empty className="home-feedback">
              <EmptyHeader><EmptyMedia variant="icon"><UtensilsCrossed
                className="size-5 text-muted-foreground"
                aria-hidden="true"
              /></EmptyMedia>
              <EmptyTitle><h3>
                {hasFilters
                  ? "No matches yet"
                  : `No restaurants in ${formatCityName(city)} yet`}
              </h3></EmptyTitle>
              <EmptyDescription>
                {hasFilters
                  ? "Try another cuisine or a shorter search."
                  : "Try the other city, or check back as local kitchens join."}
              </EmptyDescription></EmptyHeader>
              <EmptyContent><Button
                onClick={() => {
                  if (hasFilters) {
                    setSearchQuery("");
                    setActiveCategory("all");
                  } else setShowCityPicker(true);
                }}
                className="rounded-full"
              >
                {hasFilters ? "Clear filters" : "Change city"}
              </Button></EmptyContent>
            </Empty>
          )}
        </section>
        <aside className="mt-8 flex items-start gap-3 border-t border-gray-200 pt-5">
          <Check
            className="mt-0.5 size-5 shrink-0 text-green-800"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium">
              Food and delivery. One clear total.
            </p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              Review both at checkout. Kitchens start preparing after payment is verified.
            </p>
          </div>
        </aside>
      </div>
      <Modal
        isOpen={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        title="Choose your city"
        className="customer-dialog"
        variant="bottom-sheet"
      >
        <p className="mb-5 text-sm text-gray-600">
          Find restaurants serving your area. Add your full delivery address at
          checkout.
        </p>
        <div className="flex flex-col gap-3">
          {CITY_OPTIONS.map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={city === option.value}
              onClick={() => handleCityChange(option.value)}
              className={`flex min-h-14 items-center justify-between rounded-xl border px-4 py-3 ${city === option.value ? "border-brand-orange-dark bg-orange-50" : "border-gray-200 bg-white"}`}
            >
              <span className="flex items-center gap-3">
                <MapPin
                  className="size-5 text-brand-orange-dark"
                  aria-hidden="true"
                />
                {option.label}, Abia State
              </span>
              {city === option.value && (
                <Check
                  className="size-5 text-brand-orange-dark"
                  aria-hidden="true"
                />
              )}
            </button>
          ))}
        </div>
      </Modal>
    </main>
  );
}
