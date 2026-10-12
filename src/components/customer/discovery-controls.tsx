"use client";
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

export function CuisineFilters({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <ToggleGroup type="single" aria-label="Filter by cuisine" value={value} onValueChange={next => { if (next) onChange(next); }} className="flex-wrap justify-start gap-2">
    {CUISINE_FILTERS.map(category => {
      const Icon = getCuisineIcon(category.value);
      return <ToggleGroupItem key={category.value} value={category.value}>
        <Icon className="food-category-artwork" aria-hidden="true" />
        {category.label === "All" ? "All food" : category.label}
      </ToggleGroupItem>;
    })}
  </ToggleGroup>;
}
