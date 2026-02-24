'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  MapPin,
  Phone,
  User,
  ChevronDown,
  ChevronUp,
  CreditCard,
  CheckCircle,
  Loader2,
  Copy,
  Info,
} from 'lucide-react';
import { useCart } from '@/contexts/cart-context';
import { useAuth } from '@/hooks/useAuth';
import { formatPrice } from '@/lib/utils';
import { createClient } from '@/lib/supabase/client';
import type { CartItem } from '@/types/database';

// ============================================================================
// Checkout Page
// ============================================================================

export default function CheckoutPage() {
  const router = useRouter();
  const { items, restaurantId, restaurantName, deliveryFee, subtotal, total, clearCart } = useCart();
  const { user, profile, isLoading: authLoading } = useAuth();

  // Form state
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');

  // UI state
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPaymentSheet, setShowPaymentSheet] = useState(false);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderTotal, setOrderTotal] = useState(0);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Pre-fill from profile when available
  useEffect(() => {
    if (profile) {
      if (profile.full_name && !customerName) {
        setCustomerName(profile.full_name);
      }
      if (profile.phone && !phone) {
        setPhone(profile.phone);
      }
      if (profile.default_address && !deliveryAddress) {
        setDeliveryAddress(profile.default_address);
      }
    }
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Redirect if cart is empty (and not showing payment sheet)
  useEffect(() => {
    if (!authLoading && items.length === 0 && !showPaymentSheet) {
      router.replace('/home');
    }
  }, [items.length, authLoading, showPaymentSheet, router]);

  // Don't render until we know auth state + cart
  if (authLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-brand-orange animate-spin" />
      </div>
    );
  }

  if (items.length === 0 && !showPaymentSheet) {
    return null;
  }

  // ============================================================================
  // Validation
  // ============================================================================

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (!customerName.trim() || customerName.trim().length < 2) {
      newErrors.customerName = 'Name must be at least 2 characters';
    }

    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 5) {
      newErrors.deliveryAddress = 'Enter a valid delivery address';
    }

    const cleanedPhone = phone.replace(/\s|-/g, '');
    if (!/^(\+234|0)[789][01]\d{8}$/.test(cleanedPhone)) {
      newErrors.phone = 'Enter a valid Nigerian phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  // ============================================================================
  // Order submission
  // ============================================================================

  async function handlePlaceOrder() {
    if (!validate()) return;
    if (!restaurantId || !user) return;

    setIsSubmitting(true);

    try {
      const supabase = createClient();

      // Build order items payload
      const orderItems = items.map((item: CartItem) => ({
        menu_item_id: item.menu_item_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      // Fetch the restaurant's commission rate for the order snapshot
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('commission_rate')
        .eq('id', restaurantId)
        .single();

      const commissionRate = restaurant?.commission_rate ?? 6;

      // Insert the order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: user.id,
          restaurant_id: restaurantId,
          status: 'awaiting_payment' as const,
          subtotal,
          delivery_fee: deliveryFee,
          commission_rate: commissionRate,
          delivery_address: deliveryAddress.trim(),
          delivery_landmark: landmark.trim() || null,
          customer_phone: phone.replace(/\s|-/g, ''),
          customer_name: customerName.trim(),
          payment_method: 'opay_transfer' as const,
          payment_reference: null,
          payment_confirmed_by: null,
          payment_confirmed_at: null,
          notes: null,
          rating: null,
          rating_comment: null,
          cancellation_reason: null,
          rider_id: null,
        })
        .select('id, order_number, total')
        .single();

      if (orderError || !order) {
        throw new Error(orderError?.message || 'Failed to create order');
      }

      // Insert order items
      const itemsToInsert = orderItems.map((item) => ({
        order_id: order.id,
        menu_item_id: item.menu_item_id,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
        subtotal: item.price * item.quantity,
        notes: null,
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(itemsToInsert);

      if (itemsError) {
        throw new Error(itemsError.message || 'Failed to add order items');
      }

      // Update customer's default address for future convenience
      if (profile && deliveryAddress.trim() !== profile.default_address) {
        await supabase
          .from('profiles')
          .update({ default_address: deliveryAddress.trim() })
          .eq('id', user.id);
      }

      // Store order info and show payment sheet
      setOrderNumber(order.order_number);
      setOrderTotal(order.total);
      setShowPaymentSheet(true);

      // Clear the cart after successful order creation
      clearCart();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setErrors({ submit: message });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ============================================================================
  // Copy to clipboard helper
  // ============================================================================

  async function copyToClipboard(text: string, field: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Clipboard API not available
    }
  }

  // ============================================================================
  // OPay account details (from env vars or defaults)
  // ============================================================================

  const opayAccountName = process.env.NEXT_PUBLIC_OPAY_ACCOUNT_NAME || 'AbiaEats';
  const opayAccountNumber = process.env.NEXT_PUBLIC_OPAY_ACCOUNT_NUMBER || 'XXXXXXXXXX';

  // ============================================================================
  // Payment Instructions Sheet
  // ============================================================================

  if (showPaymentSheet) {
    return (
      <div className="min-h-screen bg-gray-50 overflow-x-hidden">
        <div className="max-w-lg mx-auto px-4 pb-24">
          {/* Success header */}
          <div className="text-center pt-12 pb-8">
            <CheckCircle className="w-16 h-16 text-success mx-auto mb-4" />
            <h1 className="font-bodytext-2xl font-bold text-gray-900 mb-2">
              Order Placed!
            </h1>
            <p className="text-gray-500 text-sm max-w-[280px] mx-auto">
              Transfer the exact amount below to complete your order.
            </p>
          </div>

          {/* Order number */}
          <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-4 text-center">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-1">
              Order Number
            </p>
            <p className="font-mono text-lg font-bold text-gray-900">
              {orderNumber}
            </p>
          </div>

          {/* Payment details card */}
          <div className="bg-dark-card border border-orange-200 rounded-2xl p-5 mb-4 space-y-4">
            <h2 className="font-bodytext-base font-semibold text-gray-900">
              OPay Transfer Details
            </h2>

            {/* Account Name */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Account Name</p>
                <p className="text-gray-900 font-medium text-sm">{opayAccountName}</p>
              </div>
              <button
                onClick={() => copyToClipboard(opayAccountName, 'name')}
                className="flex items-center gap-1 text-brand-orange text-xs font-medium active:scale-95 transition-transform min-h-[44px] px-2"
                aria-label="Copy account name"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedField === 'name' ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Account Number */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-xs mb-0.5">Account Number</p>
                <p className="text-gray-900 font-mono font-bold text-base">{opayAccountNumber}</p>
              </div>
              <button
                onClick={() => copyToClipboard(opayAccountNumber, 'number')}
                className="flex items-center gap-1 text-brand-orange text-xs font-medium active:scale-95 transition-transform min-h-[44px] px-2"
                aria-label="Copy account number"
              >
                <Copy className="w-3.5 h-3.5" />
                {copiedField === 'number' ? 'Copied' : 'Copy'}
              </button>
            </div>

            {/* Bank */}
            <div>
              <p className="text-gray-500 text-xs mb-0.5">Bank</p>
              <p className="text-gray-900 font-medium text-sm">OPay</p>
            </div>

            {/* Amount */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-xs mb-0.5">Amount to Transfer</p>
                  <p className="text-brand-orange font-mono font-bold text-xl">
                    {formatPrice(orderTotal)}
                  </p>
                </div>
                <button
                  onClick={() => copyToClipboard(String(orderTotal), 'amount')}
                  className="flex items-center gap-1 text-brand-orange text-xs font-medium active:scale-95 transition-transform min-h-[44px] px-2"
                  aria-label="Copy amount"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedField === 'amount' ? 'Copied' : 'Copy'}
                </button>
              </div>
            </div>
          </div>

          {/* Info notice */}
          <div className="flex items-start gap-3 bg-info/10 border border-info/20 rounded-xl p-3.5 mb-6">
            <Info className="w-4 h-4 text-info flex-shrink-0 mt-0.5" />
            <p className="text-gray-600 text-xs leading-relaxed">
              Admin will confirm your payment shortly. You will receive a WhatsApp notification once your order is confirmed and being prepared.
            </p>
          </div>

          {/* Action button */}
          <button
            onClick={() => router.push('/home')}
            className="flex items-center justify-center w-full py-4 gradient-orange text-white font-semibold rounded-xl active:scale-[0.98] transition-transform text-base min-h-[44px]"
          >
            I&apos;ve Made the Transfer
          </button>

          <p className="text-center text-gray-400 text-xs mt-4">
            You can track your order status from the home page.
          </p>
        </div>
      </div>
    );
  }

  // ============================================================================
  // Main Checkout Form
  // ============================================================================

  return (
    <div className="min-h-screen bg-gray-50 overflow-x-hidden">
      <div className="max-w-lg mx-auto px-4 pb-24">
        {/* ================================================================
            Header
            ================================================================ */}
        <header className="flex items-center gap-3 pt-6 pb-4">
          <Link
            href="/cart"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-gray-200 active:scale-95 transition-transform min-h-[44px] min-w-[44px]"
            aria-label="Back to cart"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900" />
          </Link>
          <h1 className="font-bodytext-xl font-bold text-gray-900">
            Checkout
          </h1>
        </header>

        {/* ================================================================
            Delivery Address Section
            ================================================================ */}
        <section className="mb-6">
          <h2 className="font-bodytext-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-brand-orange" />
            Delivery Address
          </h2>

          <div className="space-y-3">
            {/* Name */}
            <div>
              <label htmlFor="customerName" className="block text-xs text-gray-500 mb-1.5">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="customerName"
                  type="text"
                  placeholder="Enter your full name"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    if (errors.customerName) setErrors((prev) => ({ ...prev, customerName: '' }));
                  }}
                  className={`w-full bg-dark-card border rounded-xl min-h-[44px] pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors ${
                    errors.customerName
                      ? 'border-error focus:border-error focus:ring-1 focus:ring-error/50'
                      : 'border-gray-200 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/50'
                  }`}
                />
              </div>
              {errors.customerName && (
                <p className="text-error text-xs mt-1">{errors.customerName}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-xs text-gray-500 mb-1.5">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  id="phone"
                  type="tel"
                  placeholder="08012345678"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                  }}
                  className={`w-full bg-dark-card border rounded-xl min-h-[44px] pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors ${
                    errors.phone
                      ? 'border-error focus:border-error focus:ring-1 focus:ring-error/50'
                      : 'border-gray-200 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/50'
                  }`}
                />
              </div>
              {errors.phone && (
                <p className="text-error text-xs mt-1">{errors.phone}</p>
              )}
            </div>

            {/* Address */}
            <div>
              <label htmlFor="deliveryAddress" className="block text-xs text-gray-500 mb-1.5">
                Delivery Address
              </label>
              <div className="relative">
                <MapPin className="absolute left-3.5 top-3 w-4 h-4 text-gray-400" />
                <input
                  id="deliveryAddress"
                  type="text"
                  placeholder="Enter your delivery address"
                  value={deliveryAddress}
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value);
                    if (errors.deliveryAddress) setErrors((prev) => ({ ...prev, deliveryAddress: '' }));
                  }}
                  className={`w-full bg-dark-card border rounded-xl min-h-[44px] pl-10 pr-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors ${
                    errors.deliveryAddress
                      ? 'border-error focus:border-error focus:ring-1 focus:ring-error/50'
                      : 'border-gray-200 focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/50'
                  }`}
                />
              </div>
              {errors.deliveryAddress && (
                <p className="text-error text-xs mt-1">{errors.deliveryAddress}</p>
              )}
            </div>

            {/* Landmark */}
            <div>
              <label htmlFor="landmark" className="block text-xs text-gray-500 mb-1.5">
                Landmark / Directions{' '}
                <span className="text-gray-400">(optional)</span>
              </label>
              <input
                id="landmark"
                type="text"
                placeholder="e.g. Opposite Shoprite, beside the yellow gate"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl min-h-[44px] px-4 text-sm text-gray-900 placeholder:text-gray-400 outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/50 transition-colors"
              />
            </div>
          </div>
        </section>

        {/* ================================================================
            Order Summary Section (expandable)
            ================================================================ */}
        <section className="mb-6">
          <button
            onClick={() => setSummaryExpanded(!summaryExpanded)}
            className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 min-h-[44px] active:scale-[0.99] transition-transform"
          >
            <h2 className="font-bodytext-base font-semibold text-gray-900 flex items-center gap-2">
              Order Summary
              <span className="text-gray-400 text-xs font-body font-normal">
                ({items.length} {items.length === 1 ? 'item' : 'items'})
              </span>
            </h2>
            {summaryExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>

          {summaryExpanded && (
            <div className="bg-white border border-gray-200 border-t-0 rounded-b-xl px-4 pb-4 -mt-2 pt-4 animate-slide-down">
              {/* Restaurant name */}
              <p className="text-gray-500 text-xs mb-3">
                From{' '}
                <span className="text-gray-900 font-medium">{restaurantName}</span>
              </p>

              {/* Item list */}
              <div className="space-y-2 mb-3">
                {items.map((item: CartItem) => (
                  <div
                    key={item.menu_item_id}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-gray-600 truncate mr-2">
                      {item.name} x{item.quantity}
                    </span>
                    <span className="text-gray-900 font-mono flex-shrink-0">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-gray-200 my-3" />

              {/* Subtotal */}
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-gray-900 font-mono">{formatPrice(subtotal)}</span>
              </div>

              {/* Delivery fee */}
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-gray-500">Delivery fee</span>
                <span className="text-gray-900 font-mono">
                  {deliveryFee > 0 ? formatPrice(deliveryFee) : 'Free'}
                </span>
              </div>

              <div className="border-t border-gray-200 my-3" />

              {/* Total */}
              <div className="flex items-center justify-between">
                <span className="text-gray-900 font-semibold">Total</span>
                <span className="text-gray-900 font-mono font-bold text-lg">
                  {formatPrice(total)}
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ================================================================
            Payment Method Section
            ================================================================ */}
        <section className="mb-8">
          <h2 className="font-bodytext-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-brand-orange" />
            Payment Method
          </h2>

          <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
              <span className="text-lg" role="img" aria-label="Bank">
                🏦
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-medium text-sm">OPay Transfer</p>
              <p className="text-gray-400 text-xs mt-0.5">
                Transfer the exact amount to complete your order
              </p>
            </div>
            <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
          </div>
        </section>

        {/* ================================================================
            Submit Error
            ================================================================ */}
        {errors.submit && (
          <div className="bg-error/10 border border-error/20 rounded-xl p-3 mb-4">
            <p className="text-error text-sm">{errors.submit}</p>
          </div>
        )}

        {/* ================================================================
            Place Order Button
            ================================================================ */}
        <button
          onClick={handlePlaceOrder}
          disabled={isSubmitting || !user}
          className="flex items-center justify-center w-full py-4 gradient-orange text-white font-semibold rounded-xl active:scale-[0.98] transition-transform text-base min-h-[44px] disabled:opacity-60 disabled:active:scale-100"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              Placing Order...
            </>
          ) : (
            <>Place Order &mdash; {formatPrice(total)}</>
          )}
        </button>

        {!user && (
          <p className="text-center text-gray-400 text-xs mt-3">
            <Link href="/auth/login" className="text-brand-orange underline">
              Sign in
            </Link>{' '}
            to place your order.
          </p>
        )}
      </div>
    </div>
  );
}
