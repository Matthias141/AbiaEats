"use client";

import { ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { Button } from "@/components/ui/primitives/button";
import { Modal } from "@/components/ui/modal";

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
    <Modal
      isOpen
      onClose={onCancel}
      title="Start a new cart?"
      variant="bottom-sheet"
    >
      <div className="text-center mb-6">
        <ShoppingCart
          className="w-10 h-10 text-brand-orange mx-auto mb-3"
          strokeWidth={1.5}
          aria-hidden="true"
        />
        <p className="text-sm text-gray-500 max-w-xs mx-auto">
          You have items from{" "}
          <span className="text-gray-900 font-medium">{restaurantName}</span>.
          Adding from{" "}
          <span className="text-gray-900 font-medium">{newRestaurantName}</span>{" "}
          will clear your current cart.
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={onCancel} className="flex-1">Keep cart</Button>
        <Button variant="destructive" onClick={handleConfirm} className="flex-1">Clear cart and add</Button>
      </div>
    </Modal>
  );
}
