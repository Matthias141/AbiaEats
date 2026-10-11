import { z } from 'zod';

export const MENU_IMAGE_BUCKET = 'menu-images';
export const MENU_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const MENU_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const menuImageUploadSchema = z.object({
  filename: z.string().min(1).max(200),
  content_type: z.enum(MENU_IMAGE_TYPES),
  size: z.number().int().positive().max(MENU_IMAGE_MAX_BYTES, 'Photo must be 2MB or smaller'),
});

export function validateMenuImage(file: Pick<File, 'size' | 'type'>): string | null {
  if (!MENU_IMAGE_TYPES.some(type => type === file.type)) return 'Choose a JPG, PNG or WebP photo';
  if (file.size === 0) return 'This photo is empty';
  if (file.size > MENU_IMAGE_MAX_BYTES) return 'Photo must be 2MB or smaller';
  return null;
}

/** Only persist images in this project's bucket and this restaurant's folder. */
export function isRestaurantImageUrl(imageUrl: string, restaurantId: string, projectUrl: string): boolean {
  try {
    const url = new URL(imageUrl);
    const project = new URL(projectUrl);
    const prefix = `/storage/v1/object/public/${MENU_IMAGE_BUCKET}/${restaurantId}/`;
    const filename = url.pathname.slice(prefix.length);
    return url.protocol === 'https:' && url.origin === project.origin &&
      !url.username && !url.password && !url.search && !url.hash &&
      url.pathname.startsWith(prefix) && /^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/.test(filename);
  } catch {
    return false;
  }
}
