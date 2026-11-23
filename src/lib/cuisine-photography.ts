import { getCuisineFilter } from "@/lib/discovery";

/** Brand cuisine inspiration, never a named vendor's menu photograph. */
export const CUISINE_PHOTOS: Record<string, string> = {
  all: "/images/food-banner.webp",
  "rice-dishes": "/images/jollof-hero.webp",
  "pepper-soup": "/images/cuisine-pepper-soup.webp",
  grills: "/images/cuisine-grills.webp",
  shawarma: "/images/cuisine-shawarma.webp",
  local: "/images/cuisine-local.webp",
  drinks: "/images/cuisine-drinks.webp",
  "fast-food": "/images/cuisine-fast-food.webp",
  bakery: "/images/cuisine-bakery.webp",
};

export function getCuisinePhoto(tags: string[]): string | null {
  for (const tag of tags) {
    const cuisine = getCuisineFilter(tag);
    if (cuisine.value !== "all") return CUISINE_PHOTOS[cuisine.value] ?? null;
  }
  return null;
}
