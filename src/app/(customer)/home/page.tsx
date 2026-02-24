'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, MapPin, Star, Clock, ChevronRight, Bell } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';
import { MOCK_RESTAURANTS } from '@/lib/mock-data';
import type { Restaurant } from '@/types/database';

// ============================================================================
// Cuisine category data
// ============================================================================

const CUISINE_CATEGORIES = [
  { label: 'All', icon: '🍽️', value: 'all' },
  { label: 'Fast Food', icon: '🍔', value: 'fast food' },
  { label: 'Rice', icon: '🍚', value: 'rice dishes' },
  { label: 'Pepper Soup', icon: '🍲', value: 'pepper soup' },
  { label: 'Grills', icon: '🍖', value: 'grills' },
  { label: 'Shawarma', icon: '🌯', value: 'shawarma' },
  { label: 'Drinks', icon: '🥤', value: 'drinks' },
  { label: 'Local', icon: '🥘', value: 'local' },
  { label: 'Bakery', icon: '🍞', value: 'bakery' },
];

const CITY_STORAGE_KEY = 'abiaeats_city';

// ============================================================================
// Loading skeleton component
// ============================================================================

function RestaurantCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden card-shadow animate-pulse">
      <div className="h-40 bg-gray-100" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-gray-100 rounded-lg w-3/4" />
        <div className="flex gap-2">
          <div className="h-4 bg-gray-100 rounded-lg w-16" />
          <div className="h-4 bg-gray-100 rounded-lg w-16" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-100 rounded-lg w-20" />
          <div className="h-4 bg-gray-100 rounded-lg w-24" />
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
      className="block bg-white rounded-2xl overflow-hidden card-shadow active:scale-[0.98] transition-all hover:card-shadow-md"
    >
      {/* Cover image */}
      <div className="h-40 bg-gray-50 relative flex items-center justify-center">
        {restaurant.cover_image_url || restaurant.image_url ? (
          <img
            src={restaurant.cover_image_url || restaurant.image_url || ''}
            alt={restaurant.name}
            className="w-full h-full object-cover"
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
          <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
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
  const [city, setCity] = useState('Aba');

  // Load city from localStorage on mount
  useEffect(() => {
    try {
      const savedCity = localStorage.getItem(CITY_STORAGE_KEY);
      if (savedCity) {
        setCity(savedCity);
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
          .from('restaurants')
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

  // Filter restaurants by search query and selected category
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (restaurant.description &&
          restaurant.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        restaurant.cuisine_tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesCategory =
        activeCategory === 'all' ||
        restaurant.cuisine_tags.some((tag) =>
          tag.toLowerCase().includes(activeCategory.toLowerCase())
        );

      return matchesSearch && matchesCategory;
    });
  }, [restaurants, searchQuery, activeCategory]);

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="max-w-lg mx-auto pb-24">
        {/* ================================================================
            Header
            ================================================================ */}
        <header className="bg-white px-4 pt-6 pb-4">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-sm text-gray-400 mb-0.5">Delivering to</p>
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-brand-orange" />
                <span className="font-semibold text-gray-900">{city}, Abia State</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
            <button className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center min-h-[44px] min-w-[44px]">
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
              className="w-full bg-gray-50 rounded-2xl py-3.5 pl-12 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:ring-2 focus:ring-brand-orange/20 focus:bg-white transition-all min-h-[44px]"
            />
          </div>
        </header>

        {/* ================================================================
            Cuisine Categories (horizontal scroll)
            ================================================================ */}
        <section className="bg-white px-4 pb-4 mb-2">
          <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4">
            {CUISINE_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex flex-col items-center gap-1.5 min-w-[68px] py-2.5 px-2 rounded-2xl transition-all tap-target shrink-0 ${
                  activeCategory === cat.value
                    ? 'bg-brand-orange text-white shadow-md shadow-brand-orange/25'
                    : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
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
          <div className="gradient-orange rounded-2xl p-5 relative overflow-hidden">
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
              href="/restaurants"
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
            <div className="text-center py-16 bg-white rounded-2xl card-shadow">
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
    </div>
  );
}
