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
  const [openOnly, setOpenOnly] = useState(false);
  const [sort, setSort] = useState("orders");
  const filtered = filterRestaurants(restaurants, { search, cuisine: selectedTag, city: selectedCity }).filter(restaurant => !openOnly || restaurant.is_open);
  if (sort === "fee") filtered.sort((a, b) => a.delivery_fee - b.delivery_fee);
  if (sort === "time") filtered.sort((a, b) => a.max_delivery_time - b.max_delivery_time);
  const hasFilters = Boolean(search || selectedTag !== "all" || selectedCity || openOnly || sort !== "orders");
  return <div className="discovery-layout flex flex-col gap-5">
    <div role="search"><RestaurantSearch id="restaurant-search" value={search} onChange={setSearch} /></div>
    <div className="discovery-quick-controls"><FieldSet className="city-controls gap-2"><FieldLegend variant="label">Choose a city</FieldLegend>
      <ToggleGroup type="single" value={selectedCity || "all-cities"} aria-label="Choose a city" onValueChange={value => { if (value) setSelectedCity(value === "all-cities" ? "" : value); }} className="flex-wrap justify-start gap-2">
        {[{ label: "All cities", value: "all-cities" }, ...CITY_OPTIONS].map(city => <ToggleGroupItem key={city.value} value={city.value}>{city.label}</ToggleGroupItem>)}
      </ToggleGroup>
    </FieldSet><label className="open-filter"><input type="checkbox" checked={openOnly} onChange={event => setOpenOnly(event.target.checked)} />Open now</label></div>
    <FieldSet className="gap-2"><FieldLegend variant="label">What sounds good?</FieldLegend><CuisineFilters value={selectedTag} onChange={setSelectedTag} photographic /></FieldSet>
    <div className="discovery-results-header"><p role="status" className="text-sm text-muted-foreground">{filtered.length} {filtered.length === 1 ? "restaurant" : "restaurants"}{selectedCity ? ` in ${formatCityName(selectedCity)}` : ""}</p>
      <label className="flex min-w-0 items-center gap-2 text-sm"><span>Sort by</span><select className="discovery-sort" value={sort} onChange={event => setSort(event.target.value)}><option value="orders">Most ordered</option><option value="fee">Delivery fee</option><option value="time">Delivery time</option></select></label>
    </div>
    {filtered.length ? <div className="restaurant-grid grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(restaurant => <RestaurantCard key={restaurant.id} restaurant={restaurant} />)}</div> :
      <Empty><EmptyHeader><EmptyMedia variant="icon"><UtensilsCrossed aria-hidden="true" /></EmptyMedia>
        <EmptyTitle><h2>No restaurants found</h2></EmptyTitle>
        <EmptyDescription>{hasFilters ? "Try another city, a different cuisine, or a shorter search." : "Local kitchens will appear here as they become available."}</EmptyDescription>
      </EmptyHeader>{hasFilters && <EmptyContent><Button onClick={() => { setSearch(""); setSelectedTag("all"); setSelectedCity(""); setOpenOnly(false); setSort("orders"); }}>Clear filters</Button></EmptyContent>}</Empty>}
  </div>;
}
