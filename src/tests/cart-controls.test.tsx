// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { CartProvider } from '@/contexts/cart-context';
import CartPage from '@/app/(customer)/cart/page';
afterEach(() => { cleanup(); localStorage.clear(); });
it('confirms removing an entire cart item, preserving it on cancel', async () => {
  localStorage.setItem('abiaeats_cart', JSON.stringify({ restaurant_id: 'kitchen', restaurant_name: 'Kitchen', delivery_fee: 500, items: [{ menu_item_id: 'jollof', restaurant_id: 'kitchen', name: 'Jollof', price: 2500, quantity: 2, image_url: null }] }));
  render(<CartProvider><CartPage /></CartProvider>);
  await waitFor(() => expect(screen.getByRole('button', { name: 'Remove Jollof' })).toBeDefined());
  fireEvent.click(screen.getByRole('button', { name: 'Remove Jollof' }));
  fireEvent.click(screen.getByRole('button', { name: 'Keep cart' }));
  expect(screen.getByRole('heading', { name: 'Jollof' })).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Remove Jollof' }));
  fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Remove item' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: 'Your cart is empty' })).toBeDefined());
  expect(JSON.parse(localStorage.getItem('abiaeats_cart')!).items).toEqual([]);
});
