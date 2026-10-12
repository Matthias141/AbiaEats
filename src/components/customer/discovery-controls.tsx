"use client";
import Image from "next/image";
import { CUISINE_PHOTOS } from "@/lib/cuisine-photography";
import { Search } from "lucide-react";
import { Field, FieldLabel } from "@/components/ui/primitives/field";
import { InputGroup, InputGroupInput, InputGroupAddon } from "@/components/ui/primitives/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/primitives/toggle-group";
import { CUISINE_FILTERS } from "@/lib/discovery";
import { getCuisineIcon } from "@/lib/cuisine-icons";

export function RestaurantSearch({ id, value, onChange }: { id: string; value: string; onChange: (value: string) => void }) {
  return <Field>
    <FieldLabel htmlFor={id} className="sr-only">Search restaurants and cuisines</FieldLabel>
    <InputGroup className="restaurant-search">
      <InputGroupAddon aria-hidden="true"><Search /></InputGroupAddon>
      <InputGroupInput id={id} name="search" type="search" autoComplete="off" placeholder="Restaurant name or cuisine" value={value} onChange={event => onChange(event.target.value)} />
    </InputGroup>
  </Field>;
}

export function CuisineFilters({ value, onChange, photographic = false }: { value: string; onChange: (value: string) => void; photographic?: boolean }) {
  return <ToggleGroup type="single" aria-label="Filter by cuisine" value={value} onValueChange={next => { if (next) onChange(next); }} className={photographic ? "cuisine-strip w-full flex-nowrap justify-start gap-2 overflow-x-auto pb-3 pt-1" : "flex-wrap justify-start gap-2"}>
    {CUISINE_FILTERS.map(category => {
      const Icon = getCuisineIcon(category.value);
      return <ToggleGroupItem key={category.value} value={category.value} className={photographic ? "cuisine-chip group h-auto shrink-0 gap-2 rounded-full border border-gray-200 bg-white py-1.5 pl-1.5 pr-4 text-foreground data-[state=on]:bg-[#181818] data-[state=on]:text-white data-[state=on]:border-[#181818] data-[state=on]:ring-0" : undefined}>
        {photographic ? <span className="relative block size-10 shrink-0 overflow-hidden rounded-full"><Image src={CUISINE_PHOTOS[category.value]} alt="" fill sizes="40px" className="object-cover" /></span> : <Icon className="food-category-artwork" aria-hidden="true" />}
        <span className={photographic ? "whitespace-nowrap text-sm font-medium" : undefined}>{category.label === "All" ? "All food" : category.label}</span>
      </ToggleGroupItem>;
    })}
  </ToggleGroup>;
}
