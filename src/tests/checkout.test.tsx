// @vitest-environment jsdom

import { readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CheckoutPage from '@/app/(customer)/checkout/page';
import { createOrderAction } from '@/app/actions/create-order';

vi.mock('@/app/actions/create-order', () => ({ createOrderAction: vi.fn() }));
vi.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    user: { id: 'customer-1' },
    profile: {
      full_name: 'Chioma Okafor',
      phone: '08012345678',
      default_address: '15 Asa Road, Aba',
    },
    isLoading: false,
  }),
}));
vi.mock('@/contexts/cart-context', () => ({
  useCart: () => ({
    items: [{ menu_item_id: 'item-1', name: 'Jollof Rice', quantity: 1, price: 3500 }],
    restaurantId: 'restaurant-1',
    restaurantName: 'Demo Kitchen',
    deliveryFee: 500,
    subtotal: 3500,
    total: 4000,
    clearCart: vi.fn(),
  }),
}));

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('checkout OPay details', () => {
  it('shows the account configured through the env example and copies its number', async () => {
    const exampleEnv = parseEnv(readFileSync('.env.example', 'utf8'));
    expect(exampleEnv).toHaveProperty('NEXT_PUBLIC_OPAY_ACCOUNT_NAME');
    expect(exampleEnv).toHaveProperty('NEXT_PUBLIC_OPAY_ACCOUNT_NUMBER', '');
    const accountName = 'AbiaEats Test Account';
    const accountNumber = '0123456789';
    vi.stubEnv('NEXT_PUBLIC_OPAY_ACCOUNT_NAME', ` ${accountName} `);
    vi.stubEnv('NEXT_PUBLIC_OPAY_ACCOUNT_NUMBER', ` ${accountNumber} `);
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    vi.mocked(createOrderAction).mockResolvedValue({
      success: true,
      order_id: 'order-1',
      order_number: 'ABIA-DEMO-001',
      total: 4250,
    });

    render(<CheckoutPage />);
    fireEvent.click(screen.getByRole('button', { name: /place order/i }));

    expect(await screen.findByRole('heading', { name: 'OPay Transfer Details' })).toBeVisible();
    expect(screen.getByText(accountName)).toBeVisible();
    expect(screen.getByText(accountNumber)).toBeVisible();
    expect(screen.getByText('ABIA-DEMO-001')).toBeVisible();
    expect(screen.getByText(/₦\s*4,250/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Copy account number' }));
    expect(writeText).toHaveBeenCalledWith(accountNumber);
    expect(await screen.findByText('Copied')).toBeVisible();
  });

  it.each([
    ['missing name', undefined, '0123456789'],
    ['blank name', '  ', '0123456789'],
    ['missing number', 'AbiaEats', undefined],
    ['placeholder number', 'AbiaEats', '0000000000'],
    ['malformed number', 'AbiaEats', 'XXXXXXXXXX'],
  ])('does not create an order with a %s', (_label, name, number) => {
    vi.stubEnv('NEXT_PUBLIC_OPAY_ACCOUNT_NAME', name);
    vi.stubEnv('NEXT_PUBLIC_OPAY_ACCOUNT_NUMBER', number);

    render(<CheckoutPage />);
    const placeOrder = screen.getByRole('button', { name: /place order/i });
    expect(placeOrder).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent('OPay payments are temporarily unavailable');
    fireEvent.click(placeOrder);
    expect(createOrderAction).not.toHaveBeenCalled();
  });
});
