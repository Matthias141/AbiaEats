import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { OrderStatus } from '@/types/database';

// ============================================================================
// Classname utility
// ============================================================================

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================================
// Price formatting (Naira)
// ============================================================================

export function formatPrice(amount: number): string {
  return `₦${amount.toLocaleString('en-NG')}`;
}

// ============================================================================
// Time ago (WhatsApp-style)
// ============================================================================

export function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 172800) return 'Yesterday';
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// ============================================================================
// Order status config
// ============================================================================

export const orderStatusConfig: Record<
  OrderStatus,
  { label: string; color: string; bgColor: string; textColor: string }
> = {
  awaiting_payment: {
    label: 'Awaiting Payment',
    color: '#F59E0B',
    bgColor: 'bg-amber-500/10',
    textColor: 'text-amber-500',
  },
  confirmed: {
    label: 'Confirmed',
    color: '#3B82F6',
    bgColor: 'bg-blue-500/10',
    textColor: 'text-blue-500',
  },
  preparing: {
    label: 'Preparing',
    color: '#A855F7',
    bgColor: 'bg-purple-500/10',
    textColor: 'text-purple-500',
  },
  out_for_delivery: {
    label: 'Out for Delivery',
    color: '#F26522',
    bgColor: 'bg-orange-500/10',
    textColor: 'text-orange-500',
  },
  delivered: {
    label: 'Delivered',
    color: '#22C55E',
    bgColor: 'bg-green-500/10',
    textColor: 'text-green-500',
  },
  cancelled: {
    label: 'Cancelled',
    color: '#EF4444',
    bgColor: 'bg-red-500/10',
    textColor: 'text-red-500',
  },
};

// ============================================================================
// Valid status transitions
// ============================================================================

export const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  awaiting_payment: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'cancelled'],
  delivered: [],
  cancelled: [],
};

export function canTransition(from: OrderStatus, to: OrderStatus): boolean {
  return validTransitions[from].includes(to);
}

// ============================================================================
// Phone validation (Nigerian)
// ============================================================================

export function isValidNigerianPhone(phone: string): boolean {
  const cleaned = phone.replace(/\s|-/g, '');
  return /^(\+234|0)[789][01]\d{8}$/.test(cleaned);
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\s|-/g, '');
  if (cleaned.startsWith('+234')) return cleaned;
  if (cleaned.startsWith('0')) return `+234${cleaned.slice(1)}`;
  return `+234${cleaned}`;
}
