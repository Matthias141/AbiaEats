import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  guard: vi.fn(), client: vi.fn(), single: vi.fn(), insert: vi.fn(), update: vi.fn(), signed: vi.fn(),
}));
vi.mock('@/lib/auth-guard', () => ({ requireRole: mocks.guard }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.client }));
import { POST as createItem } from '@/app/api/restaurant/menu/route';
import { PATCH as updateItem } from '@/app/api/restaurant/menu/[id]/route';
import { POST as uploadPhoto } from '@/app/api/restaurant/upload/route';

const restaurantId = '123e4567-e89b-12d3-a456-426614174000';
const image = `https://example.supabase.co/storage/v1/object/public/menu-images/${restaurantId}/photo.jpg`;
const request = (body: object) => new Request('https://app.example/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
  mocks.guard.mockResolvedValue({ response: null, user: { id: 'owner' }, role: 'restaurant_owner' });
  const chain = { select: vi.fn(), eq: vi.fn(), insert: mocks.insert, update: mocks.update, single: mocks.single };
  chain.select.mockReturnValue(chain); chain.eq.mockReturnValue(chain);
  mocks.insert.mockReturnValue(chain); mocks.update.mockReturnValue(chain);
  mocks.client.mockResolvedValue({ from: vi.fn(() => chain), storage: { from: vi.fn(() => ({ createSignedUploadUrl: mocks.signed, getPublicUrl: () => ({ data: { publicUrl: image } }) })) } });
});

describe('Menu API photo writes', () => {
  it('actually passes the photo URL through to the database insert', async () => {
    mocks.single.mockResolvedValueOnce({ data: { id: restaurantId } }).mockResolvedValueOnce({ data: { id: 'item', image_url: image }, error: null });
    const response = await createItem(request({ restaurant_id: restaurantId, name: 'Jollof rice', price: 3500, category: 'Rice', image_url: image }));
    expect(response.status).toBe(201);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ image_url: image, price: 3500 }));
  });
  it.each([image, null])('persists a replacement or explicit removal: %s', async (image_url) => {
    mocks.single.mockResolvedValueOnce({ data: { id: 'item', restaurant_id: restaurantId, restaurants: { owner_id: 'owner' } } }).mockResolvedValueOnce({ data: { id: 'item', image_url }, error: null });
    const response = await updateItem(request({ image_url }), { params: Promise.resolve({ id: 'item' }) });
    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ image_url }));
  });
  it('rejects another restaurant photo without writing', async () => {
    mocks.single.mockResolvedValueOnce({ data: { id: restaurantId } });
    const response = await createItem(request({ restaurant_id: restaurantId, name: 'Jollof rice', price: 3500, category: 'Rice', image_url: image.replace(restaurantId, 'another-restaurant') }));
    expect(response.status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe('Signed upload API', () => {
  it('rejects oversize metadata before issuing a token', async () => {
    const response = await uploadPhoto(request({ filename: 'photo.jpg', content_type: 'image/jpeg', size: 2097153 }));
    expect(response.status).toBe(400);
    expect(mocks.signed).not.toHaveBeenCalled();
  });
  it('uses random names and an extension derived from MIME, not an unsafe filename', async () => {
    mocks.single.mockResolvedValueOnce({ data: { id: restaurantId } });
    mocks.signed.mockResolvedValue({ data: { signedUrl: 'https://upload.example', token: 'signed-token' }, error: null });
    const response = await uploadPhoto(request({ filename: '../../photo.exe', content_type: 'image/png', size: 100 }));
    expect(response.status).toBe(200);
    expect(mocks.signed).toHaveBeenCalledWith(expect.stringMatching(new RegExp(`^${restaurantId}/[0-9a-f-]{36}\\.png$`)));
    expect(await response.json()).toMatchObject({ token: 'signed-token', max_size_bytes: 2097152 });
  });
  it('does not issue a token to an account with no assigned restaurant', async () => {
    mocks.single.mockResolvedValueOnce({ data: null });
    const response = await uploadPhoto(request({ filename: 'photo.jpg', content_type: 'image/jpeg', size: 100 }));
    expect(response.status).toBe(403);
    expect(mocks.signed).not.toHaveBeenCalled();
  });
});
