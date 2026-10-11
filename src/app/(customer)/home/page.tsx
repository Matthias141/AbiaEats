"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  MapPin,
  Search,
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
  CUISINE_FILTERS,
  filterRestaurants,
  formatCityName,
  normalizeCityValue,
} from "@/lib/discovery";
import { getCuisineIcon } from "@/lib/cuisine-icons";
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
            className="hidden font-body text-2xl font-semibold tracking-tight sm:block"
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
            <span className="flex size-11 items-center justify-center rounded-full bg-orange-100 text-brand-orange-dark">
              <MapPin className="size-5" aria-hidden="true" />
            </span>
            <span>
              <span className="block text-xs text-gray-600">Find food in</span>
              <span className="flex items-center gap-2 text-sm font-semibold">
                {formatCityName(city)}, Abia
                <ChevronDown className="size-4" aria-hidden="true" />
              </span>
            </span>
          </button>
          <Link
            href="/cart"
            aria-label={`View cart, ${itemCount} items`}
            className="premium-icon-button relative flex size-11 items-center justify-center rounded-full border border-white/80 bg-white/80 text-gray-800 backdrop-blur-xl active:scale-95"
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
      <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6 sm:pt-10">
        <section className="home-hero premium-hero relative mb-7 grid overflow-hidden rounded-3xl bg-[#ffe5d2] sm:grid-cols-[1.2fr_1fr]">
          <div className="relative z-10 p-6 sm:p-10">
            <p className="mb-3 text-sm font-medium text-[#7d3515]">
              Good food. Close to home.
            </p>
            <h1 className="max-w-md text-3xl font-semibold leading-[1.12] tracking-tight text-[#311b12] sm:text-5xl">
              What are you craving today?
            </h1>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-[#674739] sm:text-base">
              Your local favourites, from the kitchen to your doorstep.
            </p>
            <a
              href="#restaurants"
              className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#311b12] px-5 text-sm font-medium text-white shadow-lg shadow-[#311b12]/20 transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:scale-[0.97]"
            >
              Find my next meal
              <ArrowRight className="size-4" aria-hidden="true" />
            </a>
          </div>
          <div className="relative hidden min-h-[280px] sm:block">
            <Image
              src="/images/jollof-hero.webp"
              alt="Jollof rice with grilled chicken and fried plantain"
              fill
              priority
              sizes="(max-width: 640px) 100vw, 480px"
              className="object-cover transition-transform duration-700 hover:scale-[1.025]"
            />
          </div>
        </section>
        <div role="search" className="relative mb-6">
          <label htmlFor="home-search" className="sr-only">
            Search restaurants and cuisines
          </label>
          <Search
            className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-500"
            aria-hidden="true"
          />
          <input
            id="home-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Find a restaurant or cuisine…"
            className="eats-search w-full py-4 pl-12 pr-4 text-base"
          />
        </div>
        <section aria-label="Filter by cuisine" className="mb-8">
          <div className="flex flex-wrap gap-2">
            {CUISINE_FILTERS.map((category) => {
              const Icon = getCuisineIcon(category.value);
              return (
                <button
                  type="button"
                  key={category.value}
                  aria-pressed={activeCategory === category.value}
                  onClick={() => setActiveCategory(category.value)}
                  className={`eats-filter ${activeCategory === category.value ? "eats-filter-active" : ""}`}
                >
                  <Icon className="size-4" aria-hidden="true" />
                  {category.label === "All" ? "All food" : category.label}
                </button>
              );
            })}
          </div>
        </section>
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
                className="text-2xl tracking-tight sm:text-3xl"
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
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <RestaurantCardSkeleton />
              <RestaurantCardSkeleton />
              <RestaurantCardSkeleton />
            </div>
          ) : error ? (
            <div role="alert" className="eats-empty">
              <UtensilsCrossed
                className="mx-auto mb-4 size-10 text-brand-orange-dark"
                aria-hidden="true"
              />
              <h3 className="text-xl">We couldn’t load restaurants</h3>
              <p className="mt-2 text-sm text-gray-600">
                Check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => void fetchRestaurants()}
                className="eats-button mt-5"
              >
                Try again
              </button>
            </div>
          ) : filtered.length ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          ) : (
            <div className="eats-empty">
              <UtensilsCrossed
                className="mx-auto mb-4 size-10 text-brand-orange-dark"
                aria-hidden="true"
              />
              <h3 className="text-xl">
                {hasFilters
                  ? "No matches yet"
                  : `No restaurants in ${formatCityName(city)} yet`}
              </h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-gray-600">
                {hasFilters
                  ? "Try another cuisine or a shorter search."
                  : "Try the other city, or check back as local kitchens join."}
              </p>
              <button
                type="button"
                onClick={() => {
                  if (hasFilters) {
                    setSearchQuery("");
                    setActiveCategory("all");
                  } else setShowCityPicker(true);
                }}
                className="eats-button mt-5"
              >
                {hasFilters ? "Clear filters" : "Change city"}
              </button>
            </div>
          )}
        </section>
        <aside className="mt-8 flex items-start gap-3 rounded-2xl border border-gray-200 bg-white p-5">
          <Check
            className="mt-0.5 size-5 shrink-0 text-green-800"
            aria-hidden="true"
          />
          <div>
            <p className="text-sm font-medium">
              A clear total before you order
            </p>
            <p className="mt-1 text-sm leading-relaxed text-gray-600">
              Review your food and delivery fees at checkout. Your restaurant
              starts preparing after payment is verified.
            </p>
          </div>
        </aside>
      </div>
      <Modal
        isOpen={showCityPicker}
        onClose={() => setShowCityPicker(false)}
        title="Choose your city"
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
