import { describe, expect, it, vi } from 'vitest';
import { createClient } from '@/lib/supabase/server';
import { createOrderAction } from '@/app/actions/create-order';

const mockedCreateClient = vi.mocked(createClient);

const UUID = {
  restaurant: '3fa85f64-5717-4562-b3fc-2c963f66afa6',
  item: 'c56a4180-65aa-42ec-a945-5fd21dec0538',
  order: '8465b47a-57eb-4273-bdb1-d0843edee033',
};

const validInput = {
  restaurant_id: UUID.restaurant,
  items: [{ menu_item_id: UUID.item, name: 'Jollof Rice', quantity: 2 }],
  delivery_address: '15 Asa Road, Aba South',
  customer_phone: '08012345678',
  customer_name: 'Chioma Okafor',
};

function buildSupabaseMock({
  authed = true,
  // 'P0001' is Postgres's default SQLSTATE for a bare RAISE EXCEPTION —
  // this is what create_order_secure's own exceptions look like once
  // PostgREST relays them, and it's the code createOrderAction checks
  // before trusting a DB error message is safe to show the user.
  rpcError = null as { message: string; code?: string } | null,
  total = 5500,
} = {}) {
  const user = authed
    ? { id: '7f5f0f89-3d48-40f7-bb6f-36bb3780a74d', email: 'customer@test.com' }
    : null;

  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
    },
    rpc: vi.fn(async () => ({
      data: rpcError
        ? null
        : [{ order_id: UUID.order, order_number: 'ABIA-20260513-0001', total }],
      error: rpcError,
    })),
  };
}

describe('security: create-order boundary', () => {
  it('does not calculate or insert prices in application code', async () => {
    const mock = buildSupabaseMock({ total: 5500 });
    mockedCreateClient.mockResolvedValue(mock as never);

    const result = await createOrderAction({
      ...validInput,
      items: [{ menu_item_id: UUID.item, name: 'Attacker-controlled label', quantity: 2 }],
    });

    expect(result.success).toBe(true);
    expect(mock.rpc).toHaveBeenCalledWith('create_order_secure', expect.objectContaining({
      p_items: [{ menu_item_id: UUID.item, quantity: 2, notes: null }],
    }));
  });

  it('blocks unauthenticated order placement before hitting the RPC', async () => {
    const mock = buildSupabaseMock({ authed: false });
    mockedCreateClient.mockResolvedValue(mock as never);

    const result = await createOrderAction(validInput);

    expect(result.success).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it.each([
    'Menu item no longer exists',
    'Menu item is currently unavailable',
    'Cart contains items from multiple restaurants',
    'This restaurant is currently closed',
  ])('surfaces database-side rejection: %s', async (message) => {
    const mock = buildSupabaseMock({ rpcError: { message, code: 'P0001' } });
    mockedCreateClient.mockResolvedValue(mock as never);

    const result = await createOrderAction(validInput);

    expect(result).toEqual({ success: false, error: message });
  });

  it('does not make a separate log_audit call because the RPC logs transactionally', async () => {
    const mock = buildSupabaseMock();
    mockedCreateClient.mockResolvedValue(mock as never);

    await createOrderAction(validInput);

    expect(mock.rpc).toHaveBeenCalledTimes(1);
    expect(mock.rpc).toHaveBeenCalledWith('create_order_secure', expect.any(Object));
  });
});
