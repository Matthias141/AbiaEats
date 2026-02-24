'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, MapPin, Star, Clock, ChevronRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatPrice } from '@/lib/utils';
import type { Restaurant } from '@/types/database';

// ============================================================================
// Cuisine category data
// ============================================================================

const CUISINE_CATEGORIES = [
  { label: 'All', emoji: '🍽️', value: 'all' },
  { label: 'Fast Food', emoji: '🍔', value: 'fast food' },
  { label: 'Rice Dishes', emoji: '🍚', value: 'rice dishes' },
  { label: 'Pepper Soup', emoji: '🍲', value: 'pepper soup' },
  { label: 'Grills', emoji: '🍖', value: 'grills' },
  { label: 'Shawarma', emoji: '🌯', value: 'shawarma' },
  { label: 'Drinks', emoji: '🥤', value: 'drinks' },
  { label: 'Local', emoji: '🥘', value: 'local' },
  { label: 'Bakery', emoji: '🍞', value: 'bakery' },
];

const CITY_STORAGE_KEY = 'abiaeats_city';

// ============================================================================
// Loading skeleton component
// ============================================================================

function RestaurantCardSkeleton() {
  return (
    <div className="bg-dark-card border border-dark-border rounded-2xl overflow-hidden animate-pulse-soft">
      <div className="h-36 bg-dark-border" />
      <div className="p-4 space-y-3">
        <div className="h-5 bg-dark-border rounded w-3/4" />
        <div className="flex gap-2">
          <div className="h-4 bg-dark-border rounded w-16" />
          <div className="h-4 bg-dark-border rounded w-16" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-4 bg-dark-border rounded w-20" />
          <div className="h-4 bg-dark-border rounded w-24" />
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Restaurant card component
// ============================================================================

function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="block bg-dark-card border border-dark-border rounded-2xl overflow-hidden active:scale-[0.98] transition-transform"
    >
      {/* Cover image */}
      <div className="h-36 bg-dark-border relative flex items-center justify-center">
        {restaurant.cover_image_url || restaurant.image_url ? (
          <img
            src={restaurant.cover_image_url || restaurant.image_url || ''}
            alt={restaurant.name}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-5xl" role="img" aria-label="Restaurant">
            🍽️
          </span>
        )}

        {/* Open/Closed badge */}
        <span
          className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-semibold ${
            restaurant.is_open
              ? 'bg-success/20 text-success'
              : 'bg-error/20 text-error'
          }`}
        >
          {restaurant.is_open ? 'Open' : 'Closed'}
        </span>
      </div>

      {/* Card content */}
      <div className="p-4 space-y-2.5">
        {/* Restaurant name */}
        <h3 className="font-heading font-semibold text-foreground text-lg leading-tight truncate">
          {restaurant.name}
        </h3>

        {/* Cuisine tags */}
        {restaurant.cuisine_tags && restaurant.cuisine_tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {restaurant.cuisine_tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 bg-dark-border/60 text-foreground/60 text-xs rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Rating, delivery time, delivery fee */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-3">
            {/* Rating */}
            <span className="flex items-center gap-1 text-success">
              <Star className="w-3.5 h-3.5 fill-current" />
              <span className="font-medium">
                {restaurant.average_rating > 0
                  ? restaurant.average_rating.toFixed(1)
                  : 'New'}
              </span>
            </span>

            {/* Delivery time */}
            <span className="flex items-center gap-1 text-foreground/50">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {restaurant.min_delivery_time}-{restaurant.max_delivery_time} min
              </span>
            </span>
          </div>

          {/* Delivery fee */}
          <span className="text-foreground/50 text-xs">
            Delivery {formatPrice(restaurant.delivery_fee)}
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

  // Fetch restaurants from Supabase
  useEffect(() => {
    async function fetchRestaurants() {
      setLoading(true);
      const supabase = createClient();
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('is_active', true)
        .order('total_orders', { ascending: false });

      if (!error && data) {
        setRestaurants(data as Restaurant[]);
      }
      setLoading(false);
    }

    fetchRestaurants();
  }, []);

  // Filter restaurants by search query and selected category
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((restaurant) => {
      // Search filter
      const matchesSearch =
        searchQuery.trim() === '' ||
        restaurant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (restaurant.description &&
          restaurant.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        restaurant.cuisine_tags.some((tag) =>
          tag.toLowerCase().includes(searchQuery.toLowerCase())
        );

      // Category filter
      const matchesCategory =
        activeCategory === 'all' ||
        restaurant.cuisine_tags.some((tag) =>
          tag.toLowerCase().includes(activeCategory.toLowerCase())
        );

      return matchesSearch && matchesCategory;
    });
  }, [restaurants, searchQuery, activeCategory]);

  return (
    <div className="min-h-screen bg-dark-bg overflow-x-hidden">
      <div className="max-w-lg mx-auto px-4 pb-24">
        {/* ================================================================
            Header - Delivery Location
            ================================================================ */}
        <header className="pt-6 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-dark-card border border-dark-border rounded-full px-3 py-1.5">
              <MapPin className="w-4 h-4 text-brand-orange" />
              <span className="text-xs text-foreground/50">Delivering to</span>
              <span className="text-sm font-medium text-foreground">{city}</span>
            </div>
          </div>
        </header>

        {/* ================================================================
            Search
            ================================================================ */}
        <section className="mb-6">
          <h1 className="font-heading text-2xl font-bold text-foreground mb-4">
            What&apos;s Your Craving Today?
          </h1>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/40" />
            <input
              type="text"
              placeholder="Search restaurants, cuisines..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-card border border-dark-border rounded-xl py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-foreground/30 outline-none focus:border-brand-orange/50 transition-colors min-h-[44px]"
            />
          </div>
        </section>

        {/* ================================================================
            Cuisine Categories (horizontal scroll)
            ================================================================ */}
        <section className="mb-6 -mx-4">
          <div className="flex gap-3 px-4 overflow-x-auto no-scrollbar">
            {CUISINE_CATEGORIES.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setActiveCategory(cat.value)}
                className={`flex flex-col items-center gap-1.5 min-w-[72px] py-2 px-2 rounded-2xl transition-colors tap-target shrink-0 ${
                  activeCategory === cat.value
                    ? 'bg-brand-orange text-white'
                    : 'bg-dark-card border border-dark-border text-foreground/70'
                }`}
              >
                <span className="text-2xl" role="img" aria-label={cat.label}>
                  {cat.emoji}
                </span>
                <span className="text-[11px] font-medium whitespace-nowrap">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* ================================================================
            Featured Banner
            ================================================================ */}
        <section className="mb-6">
          <div className="gradient-orange rounded-2xl p-5 relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-white/80 text-xs font-medium uppercase tracking-wider mb-1">
                Limited Offer
              </p>
              <h2 className="font-heading text-xl font-bold text-white mb-1">
                Free delivery on your first order!
              </h2>
              <p className="text-white/70 text-sm">
                Order now and enjoy free delivery to your doorstep.
              </p>
            </div>
            {/* Decorative circles */}
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10" />
            <div className="absolute -right-2 -bottom-4 w-20 h-20 rounded-full bg-white/5" />
          </div>
        </section>

        {/* ================================================================
            Restaurant List
            ================================================================ */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-foreground">
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
            <div className="text-center py-16">
              <span className="text-5xl block mb-4" role="img" aria-label="No restaurants">
                🍽️
              </span>
              <h3 className="font-heading text-lg font-semibold text-foreground mb-2">
                {searchQuery || activeCategory !== 'all'
                  ? 'No restaurants found'
                  : 'No restaurants available'}
              </h3>
              <p className="text-foreground/50 text-sm max-w-[260px] mx-auto">
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
                  className="mt-4 px-5 py-2.5 bg-brand-orange text-white text-sm font-medium rounded-xl active:scale-95 transition-transform min-h-[44px]"
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
