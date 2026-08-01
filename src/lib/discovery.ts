import type { RestaurantPublic } from '@/types/database';

export const CITY_OPTIONS = [
  { label: 'Aba', value: 'aba' },
  { label: 'Umuahia', value: 'umuahia' },
] as const;

export const CUISINE_FILTERS = [
  { label: 'All', value: 'all', aliases: [] },
  { label: 'Fast Food', value: 'fast-food', aliases: ['fast food', 'fast-food'] },
  {
    label: 'Rice',
    value: 'rice-dishes',
    aliases: ['rice', 'rice dishes', 'jollof', 'jollof rice'],
  },
  {
    label: 'Pepper Soup',
    value: 'pepper-soup',
    aliases: ['pepper soup', 'pepper-soup'],
  },
  { label: 'Grills', value: 'grills', aliases: ['grills', 'bbq', 'barbecue'] },
  { label: 'Shawarma', value: 'shawarma', aliases: ['shawarma'] },
  { label: 'Drinks', value: 'drinks', aliases: ['drinks', 'juice', 'smoothies'] },
  { label: 'Local', value: 'local', aliases: ['local', 'local dishes', 'traditional'] },
  { label: 'Bakery', value: 'bakery', aliases: ['bakery', 'pastries', 'bread'] },
] as const;

export type CityValue = (typeof CITY_OPTIONS)[number]['value'];

export function normalizeToken(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

export function normalizeCityValue(value?: string | null): CityValue | null {
  if (!value) return null;

  const normalized = normalizeToken(value);
  return CITY_OPTIONS.find((city) => normalizeToken(city.value) === normalized || normalizeToken(city.label) === normalized)
    ?.value ?? null;
}

export function formatCityName(value?: string | null): string {
  const city = normalizeCityValue(value);
  return CITY_OPTIONS.find((option) => option.value === city)?.label ?? 'Aba';
}

export function getCuisineFilter(value?: string | null) {
  if (!value) return CUISINE_FILTERS[0];

  const normalized = normalizeToken(value);
  return (
    CUISINE_FILTERS.find(
      (filter) =>
        normalizeToken(filter.value) === normalized ||
        normalizeToken(filter.label) === normalized ||
        filter.aliases.some((alias) => normalizeToken(alias) === normalized)
    ) ?? CUISINE_FILTERS[0]
  );
}

export function matchesCuisineTag(tags: string[], filterValue?: string | null): boolean {
  const filter = getCuisineFilter(filterValue);
  if (filter.value === 'all') return true;

  const targetTags = new Set([
    normalizeToken(filter.value),
    normalizeToken(filter.label),
    ...filter.aliases.map(normalizeToken),
  ]);

  return tags.some((tag) => targetTags.has(normalizeToken(tag)));
}

export function filterRestaurants<T extends RestaurantPublic>(
  restaurants: T[],
  options: {
    search?: string;
    cuisine?: string | null;
    city?: string | null;
  }
): T[] {
  const search = normalizeToken(options.search ?? '');
  const city = normalizeCityValue(options.city);

  return restaurants.filter((restaurant) => {
    const matchesCity = !city || restaurant.city === city;
    const matchesCuisine = matchesCuisineTag(restaurant.cuisine_tags, options.cuisine);
    const searchableText = normalizeToken(
      [
        restaurant.name,
        restaurant.description ?? '',
        restaurant.address,
        restaurant.city,
        ...restaurant.cuisine_tags,
      ].join(' ')
    );
    const matchesSearch = !search || searchableText.includes(search);

    return matchesCity && matchesCuisine && matchesSearch;
  });
}
