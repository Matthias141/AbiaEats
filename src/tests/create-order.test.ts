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
  delivery_address: '15 Asa Road, Aba',
  customer_phone: '08012345678',
  customer_name: 'Chioma Okafor',
};

function buildSupabaseMock({
  user = { id: '7f5f0f89-3d48-40f7-bb6f-36bb3780a74d', email: 'customer@test.com' } as {
    id: string;
    email: string;
  } | null,
  rpcData = [{ order_id: UUID.order, order_number: 'ABIA-20260513-0001', total: 5500 }],
  rpcError = null as { message: string } | null,
} = {}) {
  return {
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
    },
    rpc: vi.fn(async () => ({
      data: rpcError ? null : rpcData,
      error: rpcError,
    })),
  };
}

describe('createOrderAction', () => {
  it('creates orders only through the hardened create_order_secure RPC', async () => {
    const mock = buildSupabaseMock();
    mockedCreateClient.mockResolvedValue(mock as never);

    const result = await createOrderAction(validInput);

    expect(result).toEqual({
      success: true,
      order_id: UUID.order,
      order_number: 'ABIA-20260513-0001',
      total: 5500,
    });
    expect(mock.rpc).toHaveBeenCalledWith('create_order_secure', {
      p_restaurant_id: UUID.restaurant,
      p_items: [{ menu_item_id: UUID.item, quantity: 2, notes: null }],
      p_delivery_address: '15 Asa Road, Aba',
      p_delivery_landmark: null,
      p_customer_phone: '08012345678',
      p_customer_name: 'Chioma Okafor',
      p_notes: null,
    });
  });

  it('does not call the order RPC when the user is unauthenticated', async () => {
    const mock = buildSupabaseMock({ user: null });
    mockedCreateClient.mockResolvedValue(mock as never);

    const result = await createOrderAction(validInput);

    expect(result.success).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('keeps Zod validation ahead of the database RPC', async () => {
    const mock = buildSupabaseMock();
    mockedCreateClient.mockResolvedValue(mock as never);

    const result = await createOrderAction({
      ...validInput,
      items: [{ menu_item_id: UUID.item, name: 'Jollof Rice', quantity: 0 }],
    });

    expect(result.success).toBe(false);
    expect(mock.rpc).not.toHaveBeenCalled();
  });

  it('returns database validation errors from create_order_secure', async () => {
    const mock = buildSupabaseMock({
      rpcError: { message: 'Cart contains items from multiple restaurants' },
    });
    mockedCreateClient.mockResolvedValue(mock as never);

    const result = await createOrderAction(validInput);

    expect(result).toEqual({
      success: false,
      error: 'Cart contains items from multiple restaurants',
    });
  });

  it('accepts either array or object RPC return shapes', async () => {
    const mock = buildSupabaseMock({
      rpcData: { order_id: UUID.order, order_number: 'ABIA-20260513-0002', total: 3000 } as never,
    });
    mockedCreateClient.mockResolvedValue(mock as never);

    const result = await createOrderAction(validInput);

    expect(result).toEqual({
      success: true,
      order_id: UUID.order,
      order_number: 'ABIA-20260513-0002',
      total: 3000,
    });
  });
});
