"use client";

import { useState } from "react";
import { Search, UtensilsCrossed } from "lucide-react";
import { RestaurantCard } from "@/components/customer/restaurant-card";
import {
  CITY_OPTIONS,
  CUISINE_FILTERS,
  filterRestaurants,
  formatCityName,
} from "@/lib/discovery";
import { getCuisineIcon } from "@/lib/cuisine-icons";
import type { RestaurantPublic } from "@/types/database";

interface RestaurantListProps {
  restaurants: RestaurantPublic[];
  activeTag?: string;
  searchQuery?: string;
  activeCity?: string;
}

export function RestaurantList({
  restaurants,
  activeTag,
  searchQuery,
  activeCity,
}: RestaurantListProps) {
  const [search, setSearch] = useState(searchQuery || "");
  const [selectedTag, setSelectedTag] = useState(activeTag || "all");
  const [selectedCity, setSelectedCity] = useState(activeCity || "");
  const filtered = filterRestaurants(restaurants, {
    search,
    cuisine: selectedTag,
    city: selectedCity,
  });
  const hasFilters = Boolean(search || selectedTag !== "all" || selectedCity);
  return (
    <div>
      <div role="search" className="relative mb-6">
        <label htmlFor="restaurant-search" className="sr-only">
          Search restaurants and cuisines
        </label>
        <Search
          className="absolute left-4 top-1/2 size-5 -translate-y-1/2 text-gray-500"
          aria-hidden="true"
        />
        <input
          id="restaurant-search"
          type="search"
          placeholder="Find a restaurant or cuisine…"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="eats-search min-h-14 w-full py-3 pl-12 pr-4 text-base"
        />
      </div>
      <fieldset className="mb-5">
        <legend className="mb-2 text-sm font-medium text-gray-700">
          Choose a city
        </legend>
        <div className="flex flex-wrap gap-2">
          {[{ label: "All cities", value: "" }, ...CITY_OPTIONS].map((city) => (
            <button
              type="button"
              key={city.value}
              aria-pressed={selectedCity === city.value}
              onClick={() => setSelectedCity(city.value)}
              className={`eats-filter ${selectedCity === city.value ? "eats-filter-active" : ""}`}
            >
              {city.label}
            </button>
          ))}
        </div>
      </fieldset>
      <fieldset className="mb-6">
        <legend className="mb-2 text-sm font-medium text-gray-700">
          What sounds good?
        </legend>
        <div className="flex flex-wrap gap-2">
          {CUISINE_FILTERS.map((tag) => {
            const Icon = getCuisineIcon(tag.value);
            return (
              <button
                type="button"
                key={tag.value}
                aria-pressed={selectedTag === tag.value}
                onClick={() => setSelectedTag(tag.value)}
                className={`eats-filter ${selectedTag === tag.value ? "eats-filter-active" : ""}`}
              >
                <Icon className="size-6 shrink-0" aria-hidden="true" />
                {tag.label === "All" ? "All food" : tag.label}
              </button>
            );
          })}
        </div>
      </fieldset>
      <p role="status" className="mb-5 text-sm text-gray-600">
        {filtered.length} restaurant{filtered.length === 1 ? "" : "s"}
        {selectedCity ? ` in ${formatCityName(selectedCity)}` : ""}
      </p>
      {filtered.length ? (
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
          <h2 className="text-xl">No restaurants found</h2>
          <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-gray-600">
            {hasFilters
              ? "Try another city, a different cuisine, or a shorter search."
              : "Local kitchens will appear here as they become available."}
          </p>
          {hasFilters && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedTag("all");
                setSelectedCity("");
              }}
              className="eats-button mt-5"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
