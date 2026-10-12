// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from '@/contexts/cart-context';
function CartProbe() {
  const cart = useCart();
  return <p>{cart.isHydrated ? `${cart.itemCount} items, ${cart.total}` : 'Loading cart'}</p>;
}
afterEach(() => { cleanup(); localStorage.clear(); vi.restoreAllMocks(); });
describe('Cart storage hydration', () => {
  it('restores stored quantities before saving, without overwriting them with an empty cart', async () => {
    const stored = { restaurant_id: 'restaurant-a', restaurant_name: 'Kitchen', delivery_fee: 500, items: [{ menu_item_id: 'food-a', restaurant_id: 'restaurant-a', name: 'Jollof', price: 2500, quantity: 2, image_url: null }] };
    localStorage.setItem('abiaeats_cart', JSON.stringify(stored));
    const writes = vi.spyOn(Storage.prototype, 'setItem');
    render(<CartProvider><CartProbe /></CartProvider>);
    await waitFor(() => expect(screen.getByText('2 items, 5500')).toBeDefined());
    expect(JSON.parse(localStorage.getItem('abiaeats_cart')!)).toEqual(stored);
    expect(writes.mock.calls.every(([, value]) => JSON.parse(value).items.length > 0)).toBe(true);
  });
  it('opens an empty cart when stored JSON is unreadable', async () => {
    localStorage.setItem('abiaeats_cart', 'broken-json');
    render(<CartProvider><CartProbe /></CartProvider>);
    await waitFor(() => expect(screen.getByText('0 items, 0')).toBeDefined());
  });
});
