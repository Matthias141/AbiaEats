"use client";
import { useState } from "react";
import { UtensilsCrossed } from "lucide-react";
import { RestaurantCard } from "@/components/customer/restaurant-card";
import { RestaurantSearch, CuisineFilters } from "@/components/customer/discovery-controls";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/primitives/toggle-group";
import { FieldSet, FieldLegend } from "@/components/ui/primitives/field";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/primitives/empty";
import { Button } from "@/components/ui/primitives/button";
import { CITY_OPTIONS, filterRestaurants, formatCityName } from "@/lib/discovery";
import type { RestaurantPublic } from "@/types/database";
interface RestaurantListProps { restaurants: RestaurantPublic[]; activeTag?: string; searchQuery?: string; activeCity?: string; }
export function RestaurantList({ restaurants, activeTag, searchQuery, activeCity }: RestaurantListProps) {
  const [search, setSearch] = useState(searchQuery || "");
  const [selectedTag, setSelectedTag] = useState(activeTag || "all");
  const [selectedCity, setSelectedCity] = useState(activeCity || "");
  const filtered = filterRestaurants(restaurants, { search, cuisine: selectedTag, city: selectedCity });
  const hasFilters = Boolean(search || selectedTag !== "all" || selectedCity);
  return <div className="flex flex-col gap-6">
    <div role="search"><RestaurantSearch id="restaurant-search" value={search} onChange={setSearch} /></div>
    <FieldSet className="gap-2"><FieldLegend variant="label">Choose a city</FieldLegend>
      <ToggleGroup type="single" value={selectedCity || "all-cities"} aria-label="Choose a city" onValueChange={value => { if (value) setSelectedCity(value === "all-cities" ? "" : value); }} className="flex-wrap justify-start gap-2">
        {[{ label: "All cities", value: "all-cities" }, ...CITY_OPTIONS].map(city => <ToggleGroupItem key={city.value} value={city.value}>{city.label}</ToggleGroupItem>)}
      </ToggleGroup>
    </FieldSet>
    <FieldSet className="gap-2"><FieldLegend variant="label">What sounds good?</FieldLegend><CuisineFilters value={selectedTag} onChange={setSelectedTag} /></FieldSet>
    <p role="status" className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "restaurant" : "restaurants"}{selectedCity ? ` in ${formatCityName(selectedCity)}` : ""}</p>
    {filtered.length ? <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(restaurant => <RestaurantCard key={restaurant.id} restaurant={restaurant} />)}</div> :
      <Empty><EmptyHeader><EmptyMedia variant="icon"><UtensilsCrossed aria-hidden="true" /></EmptyMedia>
        <EmptyTitle><h2>No restaurants found</h2></EmptyTitle>
        <EmptyDescription>{hasFilters ? "Try another city, a different cuisine, or a shorter search." : "Local kitchens will appear here as they become available."}</EmptyDescription>
      </EmptyHeader>{hasFilters && <EmptyContent><Button onClick={() => { setSearch(""); setSelectedTag("all"); setSelectedCity(""); }}>Clear filters</Button></EmptyContent>}</Empty>}
  </div>;
}
