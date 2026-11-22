import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { updateSession } from '@/lib/supabase/middleware';
import { POST } from '@/app/api/restaurant/apply/route';

const { client } = vi.hoisted(() => ({ client: { auth: { getUser: vi.fn() }, from: vi.fn() } }));
vi.mock('@supabase/ssr', () => ({ createServerClient: vi.fn(() => client) }));

describe('vendor application access', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.auth.getUser.mockResolvedValue({ data: { user: { id: 'customer-id' } } });
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValue({ data: { role: 'customer' } }) };
    client.from.mockReturnValue(query);
  });

  it('allows a signed-in customer to reach the application', async () => {
    const response = await updateSession(new NextRequest('https://test.com/restaurant/apply'));
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  it.each(['/restaurant', '/restaurant/menu', '/restaurant/apply/other', '/admin'])('still protects %s from customers', async path => {
    const response = await updateSession(new NextRequest(`https://test.com${path}`));
    expect(response.headers.get('location')).toBe('https://test.com/');
  });

  it('sends unauthenticated applicants to login', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null } });
    const response = await updateSession(new NextRequest('https://test.com/restaurant/apply'));
    expect(response.headers.get('location')).toBe('https://test.com/auth/login?redirectTo=%2Frestaurant%2Fapply');
  });

  it('accepts a customer submission without requiring an owner role', async () => {
    const query = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), insert: vi.fn().mockReturnThis(), single: vi.fn().mockResolvedValueOnce({ data: null }).mockResolvedValueOnce({ data: { id: 'application-id' }, error: null }) };
    vi.mocked(createClient).mockResolvedValue({ auth: client.auth, from: vi.fn(() => query), rpc: vi.fn().mockResolvedValue({ error: null }) } as never);
    const response = await POST(new Request('https://test.com/api/restaurant/apply', {
      method: 'POST', body: JSON.stringify({ name: 'Test Kitchen', phone: '08012345678', address: '15 Asa Road', city: 'aba', cuisine_tags: ['nigerian'], delivery_fee: 500, min_delivery_time: 20, max_delivery_time: 45 }),
    }));
    expect(response.status).toBe(201);
    expect(query.insert).toHaveBeenCalledWith(expect.objectContaining({ applicant_id: 'customer-id' }));
  });

  it('rejects unauthenticated submissions', async () => {
    client.auth.getUser.mockResolvedValue({ data: { user: null } });
    vi.mocked(createClient).mockResolvedValue({ auth: client.auth } as never);
    expect((await POST(new Request('https://test.com/api/restaurant/apply', { method: 'POST' }))).status).toBe(401);
  });

  it('rejects an empty application from an authenticated customer', async () => {
    vi.mocked(createClient).mockResolvedValue({ auth: client.auth } as never);
    expect((await POST(new Request('https://test.com/api/restaurant/apply', { method: 'POST', body: '{}' }))).status).toBe(400);
  });
});
