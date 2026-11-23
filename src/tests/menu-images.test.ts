import { describe, expect, it } from 'vitest';
import { createMenuItemSchema, updateMenuItemSchema } from '@/lib/validations';
import { isRestaurantImageUrl, MENU_IMAGE_MAX_BYTES, menuImageUploadSchema, validateMenuImage } from '@/lib/menu-images';

const restaurantId = '123e4567-e89b-12d3-a456-426614174000';
const project = 'https://example.supabase.co';
const image = `${project}/storage/v1/object/public/menu-images/${restaurantId}/photo.jpg`;

describe('Menu photo persistence', () => {
  it('retains the uploaded URL and whole-naira price on create', () => {
    const parsed = createMenuItemSchema.parse({ restaurant_id: restaurantId, name: 'Jollof rice', price: 3500, category: 'Rice', image_url: image });
    expect(parsed.image_url).toBe(image);
    expect(parsed.price).toBe(3500);
  });
  it('supports replacing, clearing and leaving the photo untouched', () => {
    expect(updateMenuItemSchema.parse({ image_url: image }).image_url).toBe(image);
    expect(updateMenuItemSchema.parse({ image_url: null }).image_url).toBeNull();
    expect(updateMenuItemSchema.parse({ price: 4000 })).not.toHaveProperty('image_url');
  });
  it('rejects malformed URLs', () => {
    expect(updateMenuItemSchema.safeParse({ image_url: 'not a URL' }).success).toBe(false);
  });
});

describe('Photo upload limits and isolation', () => {
  it('accepts the boundary and rejects oversize, empty and unsupported files', () => {
    expect(validateMenuImage({ size: MENU_IMAGE_MAX_BYTES, type: 'image/jpeg' })).toBeNull();
    for (const file of [{ size: MENU_IMAGE_MAX_BYTES + 1, type: 'image/jpeg' }, { size: 0, type: 'image/png' }, { size: 10, type: 'image/svg+xml' }]) {
      expect(validateMenuImage(file)).not.toBeNull();
    }
  });
  it('requires bounded file metadata before issuing an upload token', () => {
    const payload = { filename: 'meal.jpg', content_type: 'image/jpeg', size: 100 };
    expect(menuImageUploadSchema.safeParse(payload).success).toBe(true);
    expect(menuImageUploadSchema.safeParse({ ...payload, size: MENU_IMAGE_MAX_BYTES + 1 }).success).toBe(false);
    expect(menuImageUploadSchema.safeParse({ filename: 'meal.jpg', content_type: 'image/jpeg' }).success).toBe(false);
  });
  it('accepts only this project and restaurant folder without URL tricks', () => {
    expect(isRestaurantImageUrl(image, restaurantId, project)).toBe(true);
    for (const url of [image.replace(restaurantId, 'other-owner'), image.replace('example.supabase.co', 'other.supabase.co'), image.replace('https:', 'http:'), `${image}?token=x`, `${image}#fragment`, image.replace('photo.jpg', '../photo.jpg'), image.replace('photo.jpg', 'photo.svg')]) {
      expect(isRestaurantImageUrl(url, restaurantId, project)).toBe(false);
    }
  });
});
