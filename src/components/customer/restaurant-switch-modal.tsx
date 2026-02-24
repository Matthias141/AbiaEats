'use client';

import { useCart } from '@/contexts/cart-context';

interface RestaurantSwitchModalProps {
  newRestaurantName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RestaurantSwitchModal({
  newRestaurantName,
  onConfirm,
  onCancel,
}: RestaurantSwitchModalProps) {
  const { restaurantName, clearCart } = useCart();

  const handleConfirm = () => {
    clearCart();
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-[70]">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onCancel}
      />
      <div className="absolute bottom-0 left-0 right-0 p-5 bg-white rounded-t-3xl animate-slide-up-sheet safe-bottom">
        <div className="flex justify-center mb-4">
          <div className="w-10 h-1 rounded-full bg-gray-200" />
        </div>
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🛒</div>
          <h3 className="text-lg font-bold text-gray-900 mb-2">Start a new cart?</h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            You have items from <span className="text-gray-900 font-medium">{restaurantName}</span>.
            Adding from <span className="text-gray-900 font-medium">{newRestaurantName}</span> will
            clear your current cart.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 min-h-[52px] rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-medium active:scale-[0.97] transition-all"
          >
            Keep Cart
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 min-h-[52px] rounded-xl gradient-orange text-white font-medium shadow-lg shadow-brand-orange/25 active:scale-[0.97] transition-all"
          >
            Clear & Add
          </button>
        </div>
      </div>
    </div>
  );
}
