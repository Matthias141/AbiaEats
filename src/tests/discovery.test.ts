import { describe, expect, it } from 'vitest';
import { filterRestaurants, formatCityName, getCuisineFilter } from '@/lib/discovery';
import { MOCK_RESTAURANTS } from '@/lib/mock-data';

describe('discovery filters', () => {
  it('normalizes city labels and values', () => {
    expect(formatCityName('aba')).toBe('Aba');
    expect(formatCityName('Umuahia')).toBe('Umuahia');
  });

  it('maps public category slugs to stored cuisine tags', () => {
    expect(getCuisineFilter('jollof').value).toBe('rice-dishes');
    expect(getCuisineFilter('pepper soup').value).toBe('pepper-soup');

    const riceRestaurants = filterRestaurants(MOCK_RESTAURANTS, {
      cuisine: 'rice-dishes',
    });

    expect(riceRestaurants.map((restaurant) => restaurant.name)).toContain(
      'Mama Put Kitchen'
    );
  });

  it('filters restaurants by city, search, and cuisine together', () => {
    const results = filterRestaurants(MOCK_RESTAURANTS, {
      city: 'aba',
      search: 'shawarma',
      cuisine: 'fast-food',
    });

    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Aba Grills & Shawarma');
  });
});
