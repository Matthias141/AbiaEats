import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMenuItemSchema, updateMenuItemSchema } from '@/lib/validations';

const mocks = vi.hoisted(() => ({ guard: vi.fn(), client: vi.fn(), single: vi.fn(), update: vi.fn() }));
vi.mock('@/lib/auth-guard', () => ({ requireRole: mocks.guard }));
vi.mock('@/lib/supabase/server', () => ({ createClient: mocks.client }));
import { PATCH } from '@/app/api/restaurant/menu/[id]/route';

const request = (body: object) => new Request('https://app.example/api/restaurant/menu/item', {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});
const params = { params: Promise.resolve({ id: 'item' }) };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.guard.mockResolvedValue({ response: null, user: { id: 'owner' }, role: 'restaurant_owner' });
  const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: mocks.single, update: mocks.update };
  mocks.update.mockReturnValue(chain);
  mocks.client.mockResolvedValue({ from: vi.fn(() => chain) });
  mocks.single.mockResolvedValueOnce({ data: { id: 'item', restaurants: { owner_id: 'owner' } } });
});

describe('Menu availability PATCH', () => {
  it.each([true, false])('changes only availability to %s, preserving popular and sort order', async (is_available) => {
    const existing = { id: 'item', name: 'Jollof Rice', is_available: !is_available, is_popular: true, sort_order: 7 };
    mocks.update.mockImplementation((patch) => {
      mocks.single.mockResolvedValueOnce({ data: { ...existing, ...patch }, error: null });
      return { eq: vi.fn().mockReturnThis(), select: vi.fn().mockReturnThis(), single: mocks.single };
    });

    const response = await PATCH(request({ is_available }), params);

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({ is_available });
    expect(await response.json()).toEqual({ ...existing, is_available });
  });

  it('does not inject values into an empty patch', async () => {
    expect(updateMenuItemSchema.parse({})).toEqual({});
    mocks.single.mockResolvedValueOnce({ data: { id: 'item' }, error: null });
    expect((await PATCH(request({}), params)).status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({});
  });

  it('rejects invalid availability before writing', async () => {
    expect((await PATCH(request({ is_available: 'false' }), params)).status).toBe(400);
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('still accepts explicit popular and sort order updates', () => {
    const patch = { is_popular: false, sort_order: 0 };
    expect(updateMenuItemSchema.parse(patch)).toEqual(patch);
  });

  it('keeps defaults for newly created items', () => {
    expect(createMenuItemSchema.parse({
      restaurant_id: '123e4567-e89b-12d3-a456-426614174000',
      name: 'Jollof Rice', price: 500, category: 'Rice',
    })).toMatchObject({ is_available: true, is_popular: false, sort_order: 0 });
  });
});
