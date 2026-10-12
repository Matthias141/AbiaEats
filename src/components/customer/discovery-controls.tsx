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
    <InputGroup>
      <InputGroupAddon aria-hidden="true"><Search /></InputGroupAddon>
      <InputGroupInput id={id} name="search" type="search" autoComplete="off" placeholder="Restaurant name or cuisine" value={value} onChange={event => onChange(event.target.value)} />
    </InputGroup>
  </Field>;
}

export function CuisineFilters({ value, onChange, photographic = false }: { value: string; onChange: (value: string) => void; photographic?: boolean }) {
  return <ToggleGroup type="single" aria-label="Filter by cuisine" value={value} onValueChange={next => { if (next) onChange(next); }} className={photographic ? "w-full flex-nowrap justify-start gap-3 overflow-x-auto pb-3 pt-1" : "flex-wrap justify-start gap-2"}>
    {CUISINE_FILTERS.map(category => {
      const Icon = getCuisineIcon(category.value);
      return <ToggleGroupItem key={category.value} value={category.value} className={photographic ? "h-auto w-28 shrink-0 flex-col items-stretch gap-0 overflow-hidden rounded-2xl border border-border bg-white p-0 text-foreground sm:w-36 data-[state=on]:border-primary data-[state=on]:ring-2 data-[state=on]:ring-inset data-[state=on]:ring-primary" : undefined}>
        {photographic ? <span className="relative block aspect-[4/3] w-full overflow-hidden"><Image src={CUISINE_PHOTOS[category.value]} alt="" fill sizes="(min-width: 640px) 144px, 112px" className="object-cover" /></span> : <Icon className="food-category-artwork" aria-hidden="true" />}
        <span className={photographic ? "px-2 py-2.5 text-sm font-semibold" : undefined}>{category.label === "All" ? "All food" : category.label}</span>
      </ToggleGroupItem>;
    })}
  </ToggleGroup>;
}
