'use client';

import { useCart } from '@/contexts/cart-context';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag } from 'lucide-react';

// ============================================================================
// Cart Page — Light Theme
// ============================================================================

export default function CartPage() {
  const {
    items,
    restaurantName,
    deliveryFee,
    subtotal,
    total,
    itemCount,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCart();

  const isEmpty = items.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="max-w-lg mx-auto pb-24">
        {/* ================================================================
            Header
            ================================================================ */}
        <header className="bg-white px-4 flex items-center gap-3 pt-6 pb-4">
          <Link
            href="/home"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gray-50 active:scale-95 transition-transform min-h-[44px] min-w-[44px]"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">
            Cart
          </h1>
          {!isEmpty && (
            <span className="ml-auto text-sm text-gray-400">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </span>
          )}
        </header>

        {/* ================================================================
            Empty State
            ================================================================ */}
        {isEmpty && (
          <div className="text-center py-24 px-4">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <ShoppingBag className="w-10 h-10 text-gray-300" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Your cart is empty
            </h2>
            <p className="text-gray-500 text-sm max-w-[260px] mx-auto mb-6">
              Browse restaurants and add items to get started.
            </p>
            <Link
              href="/home"
              className="inline-flex items-center justify-center px-6 py-3 gradient-orange text-white text-sm font-semibold rounded-xl active:scale-95 transition-transform min-h-[44px]"
            >
              Browse Restaurants
            </Link>
          </div>
        )}

        {/* ================================================================
            Cart Items
            ================================================================ */}
        {!isEmpty && (
          <div className="px-4 pt-4">
            {/* Restaurant name banner */}
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                Ordering from{' '}
                <span className="font-semibold text-gray-900">
                  {restaurantName}
                </span>
              </p>
              <button
                onClick={clearCart}
                className="text-xs text-red-500 font-medium active:scale-95 transition-transform min-h-[44px] flex items-center"
              >
                Clear all
              </button>
            </div>

            {/* Item list */}
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div
                  key={item.menu_item_id}
                  className="flex items-center gap-3 bg-white rounded-2xl p-3 card-shadow"
                >
                  {/* Item image */}
                  <div className="w-16 h-16 rounded-xl bg-gray-50 flex-shrink-0 flex items-center justify-center overflow-hidden">
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-2xl" role="img" aria-label="Food">
                        🍽️
                      </span>
                    )}
                  </div>

                  {/* Item details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm text-gray-900 truncate">
                      {item.name}
                    </h3>
                    <p className="text-brand-orange font-mono text-sm font-semibold mt-0.5">
                      {formatPrice(item.price)}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-gray-100 text-gray-600 active:scale-90 transition-transform min-h-[44px] min-w-[44px] -m-2 p-2"
                      aria-label={`Decrease ${item.name} quantity`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>

                    <span className="w-6 text-center text-sm font-semibold text-gray-900 font-mono">
                      {item.quantity}
                    </span>

                    <button
                      onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}
                      disabled={item.quantity >= 20}
                      className="flex items-center justify-center w-8 h-8 rounded-lg bg-orange-50 text-brand-orange active:scale-90 transition-transform disabled:opacity-30 min-h-[44px] min-w-[44px] -m-2 p-2"
                      aria-label={`Increase ${item.name} quantity`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => removeItem(item.menu_item_id)}
                      className="flex items-center justify-center w-8 h-8 rounded-lg text-red-400 hover:text-red-500 active:scale-90 transition-all ml-1 min-h-[44px] min-w-[44px] -m-2 p-2"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* ================================================================
                Order Summary
                ================================================================ */}
            <div className="bg-white rounded-2xl p-4 mb-6 space-y-3 card-shadow">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                Order Summary
              </h3>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900 font-mono">
                  {formatPrice(subtotal)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Delivery fee</span>
                <span className="text-gray-900 font-mono">
                  {deliveryFee > 0 ? formatPrice(deliveryFee) : 'Free'}
                </span>
              </div>

              <div className="border-t border-gray-100 my-2" />

              <div className="flex items-center justify-between">
                <span className="text-gray-900 font-semibold">Total</span>
                <span className="text-gray-900 font-mono font-bold text-lg">
                  {formatPrice(total)}
                </span>
              </div>
            </div>

            {/* ================================================================
                Checkout Button
                ================================================================ */}
            <Link
              href="/checkout"
              className="flex items-center justify-center w-full py-4 gradient-orange text-white font-semibold rounded-2xl active:scale-[0.98] transition-transform text-base min-h-[44px] shadow-lg shadow-brand-orange/25"
            >
              Proceed to Checkout
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
