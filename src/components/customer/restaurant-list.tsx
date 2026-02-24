'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Star, Clock, MapPin } from 'lucide-react';
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
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search restaurants..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full min-h-[48px] pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all"
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
                ? 'gradient-orange text-white border-transparent shadow-md shadow-brand-orange/20'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
            {tag.label}
          </button>
        ))}
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-400 mb-4">
        {filtered.length} restaurant{filtered.length !== 1 ? 's' : ''} found
      </p>

      {/* Restaurant Grid */}
      {filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((restaurant) => (
            <Link
              key={restaurant.id}
              href={`/restaurants/${restaurant.id}`}
              className="group rounded-2xl bg-white overflow-hidden card-shadow hover:card-shadow-md transition-all active:scale-[0.99]"
            >
              {/* Image */}
              <div className="aspect-video bg-gray-50 relative overflow-hidden flex items-center justify-center">
                {restaurant.cover_image_url ? (
                  <img
                    src={restaurant.cover_image_url}
                    alt={restaurant.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
                    <span className="text-4xl">
                      {restaurant.cuisine_tags.includes('grills') ? '🍖' :
                       restaurant.cuisine_tags.includes('shawarma') ? '🌯' :
                       restaurant.cuisine_tags.includes('bakery') ? '🍞' :
                       restaurant.cuisine_tags.includes('drinks') ? '🥤' :
                       '🍽️'}
                    </span>
                  </div>
                )}
                {/* Open/Closed badge */}
                {!restaurant.is_open && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                    <span className="bg-white/90 text-gray-800 text-sm font-semibold px-4 py-1.5 rounded-full">
                      Closed
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-gray-900 group-hover:text-brand-orange transition-colors truncate">
                      {restaurant.name}
                    </h3>
                    {restaurant.description && (
                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        {restaurant.description}
                      </p>
                    )}
                  </div>
                  {restaurant.rating_count > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-medium ml-2 flex-shrink-0">
                      <Star className="w-3 h-3 fill-current" />
                      {restaurant.average_rating.toFixed(1)}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
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
                      className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500"
                    >
                      {tag}
                    </span>
                  ))}
                  {restaurant.cuisine_tags.length > 3 && (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-400">
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
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No restaurants found</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
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
