'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Search, MapPin, Star, Clock, ChevronRight, ChevronDown, Bell, Check, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  CITY_OPTIONS,
  CUISINE_FILTERS,
  filterRestaurants,
  formatCityName,
  normalizeCityValue,
} from '@/lib/discovery';
import { formatPrice } from '@/lib/utils';
import { MOCK_RESTAURANTS } from '@/lib/mock-data';
import type { Restaurant } from '@/types/database';

// ============================================================================
// Cuisine category data
// ============================================================================

const CUISINE_CATEGORIES = [
  { ...CUISINE_FILTERS[0], icon: '🍽️' },
  { ...CUISINE_FILTERS[1], icon: '🍔' },
  { ...CUISINE_FILTERS[2], icon: '🍚' },
  { ...CUISINE_FILTERS[3], icon: '🍲' },
  { ...CUISINE_FILTERS[4], icon: '🍖' },
  { ...CUISINE_FILTERS[5], icon: '🌯' },
  { ...CUISINE_FILTERS[6], icon: '🥤' },
  { ...CUISINE_FILTERS[7], icon: '🥘' },
  { ...CUISINE_FILTERS[8], icon: '🍞' },
];

const CITY_STORAGE_KEY = 'abiaeats_city';

// ============================================================================
// Loading skeleton component
// ============================================================================

function RestaurantCardSkeleton() {
  return (
    <div className="liquid-glass rounded-2xl overflow-hidden animate-pulse">
      <div className="h-40 bg-white/50" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-white/70 rounded-lg w-3/4" />
        <div className="flex gap-2">
          <div className="h-4 bg-white/70 rounded-lg w-16" />
          <div className="h-4 bg-white/70 rounded-lg w-16" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-4 bg-white/70 rounded-lg w-20" />
          <div className="h-4 bg-white/70 rounded-lg w-24" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Restaurant card component - Clean modern style
// ============================================================================

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="liquid-glass liquid-lift block rounded-2xl overflow-hidden active:scale-[0.98] transition-all"
    >
      {/* Cover image */}
      <div className="h-40 bg-gray-50 relative flex items-center justify-center">
        {restaurant.cover_image_url || restaurant.image_url ? (
          <Image
            src={restaurant.cover_image_url || restaurant.image_url || ''}
            alt={restaurant.name}
            fill
            sizes="(max-width: 640px) 100vw, 512px"
            className="object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
            <span className="text-5xl" role="img" aria-label="Restaurant">
              {restaurant.cuisine_tags.includes('grills') ? '🍖' :
               restaurant.cuisine_tags.includes('shawarma') ? '🌯' :
               restaurant.cuisine_tags.includes('bakery') ? '🍞' :
               restaurant.cuisine_tags.includes('drinks') ? '🥤' :
               restaurant.cuisine_tags.includes('pepper soup') ? '🍲' :
               restaurant.cuisine_tags.includes('fast food') ? '🍔' :
               '🍽️'}
            </span>
          </div>
        )}

        {/* Rating badge */}
        {restaurant.rating_count > 0 && (
          <div className="absolute top-3 right-3 flex items-center gap-1 liquid-chip px-2.5 py-1 rounded-full">
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span className="text-xs font-semibold text-gray-800">
              {restaurant.average_rating.toFixed(1)}
            </span>
          </div>
        )}

        {/* Closed overlay */}
        {!restaurant.is_open && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="bg-white/90 text-gray-800 text-sm font-semibold px-4 py-1.5 rounded-full">
              Closed
            </span>
          </div>
        )}
      </div>

      {/* Card content */}
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 text-base mb-1 truncate">
          {restaurant.name}
        </h3>

        {/* Cuisine tags as subtle text */}
        {restaurant.cuisine_tags && restaurant.cuisine_tags.length > 0 && (
          <p className="text-sm text-gray-500 mb-2.5 truncate">
            {restaurant.cuisine_tags.slice(0, 3).join(' · ')}
          </p>
        )}

        {/* Delivery info */}
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            {restaurant.min_delivery_time}-{restaurant.max_delivery_time} min
          </span>
          <span className="text-gray-300">|</span>
          <span>
            {restaurant.delivery_fee === 0 ? (
              <span className="text-green-600 font-medium">Free delivery</span>
            ) : (
              formatPrice(restaurant.delivery_fee)
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ============================================================================
// Main customer home page
// ============================================================================

export default function CustomerHomePage() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [city, setCity] = useState('aba');
  const [showCityPicker, setShowCityPicker] = useState(false);

  // Load city from localStorage on mount
  useEffect(() => {
    try {
      const savedCity = localStorage.getItem(CITY_STORAGE_KEY);
      const normalizedCity = normalizeCityValue(savedCity);
      if (normalizedCity) {
        setCity(normalizedCity);
      }
    } catch {
      // localStorage not available, use default
    }
  }, []);

  // Fetch restaurants from Supabase, fall back to mock data
  useEffect(() => {
    async function fetchRestaurants() {
      setLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from('restaurants_public')
          .select('*')
          .eq('is_active', true)
          .order('total_orders', { ascending: false });

        if (!error && data && data.length > 0) {
          setRestaurants(data as Restaurant[]);
        } else {
          // Use mock data when Supabase returns nothing
          setRestaurants(MOCK_RESTAURANTS);
        }
      } catch {
        // Supabase not configured — use mock data
        setRestaurants(MOCK_RESTAURANTS);
      }
      setLoading(false);
    }

    fetchRestaurants();
  }, []);

  // Handle city change
  const handleCityChange = (newCity: string) => {
    setCity(newCity);
    try {
      localStorage.setItem(CITY_STORAGE_KEY, newCity);
    } catch {
      // localStorage not available
    }
    setShowCityPicker(false);
  };

  // Filter restaurants by search query and selected category
  const filteredRestaurants = useMemo(() => {
    return filterRestaurants(restaurants, {
      search: searchQuery,
      cuisine: activeCategory,
      city,
    });
  }, [restaurants, searchQuery, activeCategory, city]);

  return (
    <div className="min-h-screen liquid-surface overflow-x-hidden">
      <div className="max-w-lg mx-auto pb-24">
        {/* ================================================================
            Header
            ================================================================ */}
        <header className="liquid-glass-nav px-4 pt-6 pb-4 rounded-b-[2rem] border-t-0 border-x-0">
          <div className="flex items-center justify-between mb-5">
            <button
              onClick={() => setShowCityPicker(true)}
              className="text-left tap-target rounded-2xl px-2 -ml-2 transition-colors hover:bg-white/35"
            >
              <p className="text-sm text-gray-400 mb-0.5">Delivering to</p>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-orange" />
                <span className="font-semibold text-gray-900">{formatCityName(city)}, Abia State</span>
                <ChevronDown className="w-4 h-4 text-gray-400" />
              </div>
            </button>
            <button className="w-10 h-10 rounded-full liquid-chip flex items-center justify-center min-h-[44px] min-w-[44px]">
              <Bell className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search restaurants, cuisines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full liquid-input rounded-2xl py-3.5 pl-12 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-brand-orange/20 transition-all min-h-[44px]"
            />
          </div>
        </header>

        {/* ================================================================
            Cuisine Categories (horizontal scroll)
            ================================================================ */}
        <section className="px-4 pb-4 mb-2 pt-4">
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
            {CUISINE_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex flex-col items-center gap-1.5 min-w-[68px] py-2.5 px-2 rounded-2xl transition-all tap-target shrink-0 ${
                  activeCategory === cat.value
                    ? 'liquid-glass-strong text-white shadow-md shadow-brand-orange/25'
                    : 'liquid-chip text-gray-600 hover:bg-white/80'
                }`}
              >
                <span className="text-2xl" role="img" aria-label={cat.label}>
                  {cat.icon}
                </span>
                <span className="text-[11px] font-medium whitespace-nowrap">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ================================================================
            Promo Banner
            ================================================================ */}
        <section className="px-4 mb-4">
          <div className="liquid-glass-strong rounded-2xl p-5 relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-white/80 text-xs font-semibold uppercase tracking-wider mb-1">
                Limited Offer
              </p>
              <h2 className="text-lg font-bold text-white mb-1">
                Free delivery on your first order!
              </h2>
              <p className="text-white/70 text-sm">
                Order now and save on delivery.
              </p>
            </div>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-5xl opacity-30">
              🎉
            </div>
          </div>
        </section>

        {/* ================================================================
            Restaurant List
            ================================================================ */}
        <section className="px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Popular Near You
            </h2>
            <Link
              href={`/restaurants?city=${city}`}
              className="flex items-center gap-0.5 text-brand-orange text-sm font-medium tap-target"
            >
              See all
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Loading state */}
          {loading && (
            <div className="grid gap-4">
              <RestaurantCardSkeleton />
              <RestaurantCardSkeleton />
              <RestaurantCardSkeleton />
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredRestaurants.length === 0 && (
            <div className="text-center py-16 liquid-glass rounded-2xl">
              <span className="text-5xl block mb-4" role="img" aria-label="No restaurants">
                🍽️
              </span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchQuery || activeCategory !== 'all'
                  ? 'No restaurants found'
                  : 'No restaurants available'}
              </h3>
              <p className="text-gray-500 text-sm max-w-[260px] mx-auto">
                {searchQuery || activeCategory !== 'all'
                  ? 'Try a different search term or browse all categories.'
                  : 'Restaurants are being added soon. Check back shortly!'}
              </p>
              {(searchQuery || activeCategory !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setActiveCategory('all');
                  }}
                  className="mt-4 px-5 py-2.5 gradient-orange text-white text-sm font-medium rounded-xl active:scale-95 transition-transform min-h-[44px]"
                >
                  Clear filters
                </button>
              )}
            </div>
          )}

          {/* Restaurant grid */}
          {!loading && filteredRestaurants.length > 0 && (
            <div className="grid gap-4">
              {filteredRestaurants.map((restaurant) => (
                <RestaurantCard key={restaurant.id} restaurant={restaurant} />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* City Picker Modal */}
      {showCityPicker && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/35 backdrop-blur-sm"
            onClick={() => setShowCityPicker(false)}
          />
          {/* Sheet */}
          <div className="relative w-full max-w-lg liquid-glass rounded-t-3xl p-6 pb-8 animate-slide-up-sheet">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Select your city</h2>
              <button
                onClick={() => setShowCityPicker(false)}
                className="w-8 h-8 rounded-full liquid-chip flex items-center justify-center"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="space-y-2">
              {CITY_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleCityChange(option.value)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition-all active:scale-[0.98] min-h-[44px] ${
                    city === option.value
                      ? 'border-brand-orange bg-orange-50'
                      : 'border-white/60 bg-white/50 hover:border-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className={`w-5 h-5 ${city === option.value ? 'text-brand-orange' : 'text-gray-400'}`} />
                    <span className={`font-medium ${city === option.value ? 'text-gray-900' : 'text-gray-600'}`}>
                      {option.label}, Abia State
                    </span>
                  </div>
                  {city === option.value && <Check className="w-5 h-5 text-brand-orange" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
