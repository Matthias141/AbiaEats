'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Star, Clock, MapPin, Utensils } from 'lucide-react';
import type { Restaurant } from '@/types/database';
import { formatPrice } from '@/lib/utils';

const CUISINE_TAGS = [
  { label: 'All', value: '' },
  { label: 'Jollof', value: 'jollof' },
  { label: 'Pepper Soup', value: 'pepper-soup' },
  { label: 'Grills', value: 'grills' },
  { label: 'Shawarma', value: 'shawarma' },
  { label: 'Local', value: 'local' },
  { label: 'Drinks', value: 'drinks' },
  { label: 'Rice', value: 'rice' },
];

interface RestaurantListProps {
  restaurants: Restaurant[];
  activeTag?: string;
  searchQuery?: string;
}

export function RestaurantList({ restaurants, activeTag, searchQuery }: RestaurantListProps) {
  const [search, setSearch] = useState(searchQuery || '');
  const [selectedTag, setSelectedTag] = useState(activeTag || '');

  const filtered = restaurants.filter((r) => {
    const matchesSearch = !search || r.name.toLowerCase().includes(search.toLowerCase());
    const matchesTag = !selectedTag || r.cuisine_tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  return (
    <div>
      {/* Search Bar */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
        <input
          type="text"
          placeholder="Search restaurants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full min-h-[48px] pl-11 pr-4 bg-dark-card border border-dark-border rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/50 transition-colors"
        />
      </div>

      {/* Tag Filters */}
      <div className="flex gap-2 overflow-x-auto pb-4 mb-6 no-scrollbar">
        {CUISINE_TAGS.map((tag) => (
          <button
            key={tag.value}
            onClick={() => setSelectedTag(tag.value)}
            className={`tap-target whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border transition-all active:scale-[0.97] ${
              selectedTag === tag.value
                ? 'gradient-orange text-white border-transparent'
                : 'bg-dark-card border-dark-border text-foreground/60 hover:border-dark-border-light'
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <p className="text-sm text-foreground/40 mb-4">
        {filtered.length} restaurant{filtered.length !== 1 ? 's' : ''} found
      </p>

      {/* Restaurant Grid */}
      {filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/restaurants/${restaurant.id}`}
              className="group rounded-2xl bg-dark-card border border-dark-border overflow-hidden hover:border-dark-border-light transition-all active:scale-[0.99]"
            >
              {/* Image */}
              <div className="aspect-video bg-dark-border/30 relative overflow-hidden flex items-center justify-center">
                {restaurant.cover_image_url ? (
                  <img
                    src={restaurant.cover_image_url}
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <Utensils className="w-10 h-10 text-foreground/10" />
                )}
                {/* Open/Closed badge */}
                <div
                  className={`absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-medium ${
                    restaurant.is_open
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {restaurant.is_open ? 'Open' : 'Closed'}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-heading font-semibold text-foreground group-hover:text-brand-orange transition-colors truncate">
                      {restaurant.name}
                    </h3>
                    {restaurant.description && (
                      <p className="text-xs text-foreground/50 truncate mt-0.5">
                        {restaurant.description}
                      </p>
                    )}
                  </div>
                  {restaurant.rating_count > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 text-green-500 text-xs font-medium ml-2 flex-shrink-0">
                      <Star className="w-3 h-3 fill-current" />
                      {restaurant.average_rating.toFixed(1)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-foreground/50 mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {restaurant.min_delivery_time}-{restaurant.max_delivery_time} min
                  </span>
                  <span>{formatPrice(restaurant.delivery_fee)} delivery</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {restaurant.city === 'aba' ? 'Aba' : 'Umuahia'}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {restaurant.cuisine_tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-0.5 rounded-full bg-dark-border/50 text-xs text-foreground/60"
                    >
                      {tag}
                    </span>
                  ))}
                  {restaurant.cuisine_tags.length > 3 && (
                    <span className="px-2 py-0.5 rounded-full bg-dark-border/50 text-xs text-foreground/40">
                      +{restaurant.cuisine_tags.length - 3}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🍽️</div>
          <h3 className="font-heading text-lg font-semibold mb-2">No restaurants found</h3>
          <p className="text-sm text-foreground/50 max-w-xs mx-auto">
            {search
              ? `No restaurants match "${search}". Try a different search.`
              : 'No restaurants available right now. Check back soon!'}
          </p>
          {(search || selectedTag) && (
            <button
              onClick={() => {
                setSearch('');
                setSelectedTag('');
              }}
              className="mt-4 tap-target px-5 py-2.5 rounded-xl text-sm font-medium gradient-orange text-white"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
