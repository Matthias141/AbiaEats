import {
  UtensilsCrossed,
  Pizza,
  Soup,
  CookingPot,
  Flame,
  Sandwich,
  CupSoda,
  ChefHat,
  Wheat,
  type LucideIcon,
} from 'lucide-react';

/**
 * Maps cuisine tags/filter values to a Lucide icon. Keys are lowercase and
 * cover both the discovery filter `value`s (e.g. "rice-dishes") and the
 * free-text tags restaurants store (e.g. "rice dishes", "jollof").
 */
const cuisineIconMap: Record<string, LucideIcon> = {
  all: UtensilsCrossed,
  'fast-food': Pizza,
  'fast food': Pizza,
  'rice-dishes': Soup,
  'rice dishes': Soup,
  rice: Soup,
  jollof: Soup,
  'jollof rice': Soup,
  'pepper-soup': CookingPot,
  'pepper soup': CookingPot,
  grills: Flame,
  bbq: Flame,
  barbecue: Flame,
  shawarma: Sandwich,
  drinks: CupSoda,
  juice: CupSoda,
  smoothies: CupSoda,
  local: ChefHat,
  'local dishes': ChefHat,
  traditional: ChefHat,
  bakery: Wheat,
  pastries: Wheat,
  bread: Wheat,
};

/** Resolves the best-matching Lucide icon for a cuisine tag or list of tags. */
export function getCuisineIcon(tags?: string[] | string | null): LucideIcon {
  if (!tags) return UtensilsCrossed;
  const list = Array.isArray(tags) ? tags : [tags];
  for (const tag of list) {
    const key = tag?.toLowerCase().trim();
    if (key && cuisineIconMap[key]) return cuisineIconMap[key];
  }
  return UtensilsCrossed;
}

interface CuisineIconProps {
  tags?: string[] | string | null;
  className?: string;
}

/** Renders the icon that best represents a restaurant's cuisine tags. */
export function CuisineIcon({ tags, className }: CuisineIconProps) {
  const Icon = getCuisineIcon(tags);
  return <Icon className={className} aria-hidden="true" />;
}
