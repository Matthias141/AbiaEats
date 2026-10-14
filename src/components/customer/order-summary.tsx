"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { Button } from "@/components/ui/primitives/button";
import { Separator } from "@/components/ui/primitives/separator";
import { formatPrice } from "@/lib/utils";

/** Presentation only: all amounts come from the existing cart context. */
export function OrderSummary({ id, destination = "checkout", previewItems = false }: {
  id: string;
  destination?: "cart" | "checkout";
  previewItems?: boolean;
}) {
  const { isHydrated, items, restaurantName, itemCount, subtotal, deliveryFee, total } = useCart();
  return (
    <section aria-labelledby={id} className="order-summary">
      <h2 id={id} className="break-words text-lg font-semibold">{destination === "cart" ? "Your order" : "Order summary"}</h2>
      {!isHydrated ? <p role="status" className="text-sm text-muted-foreground">Loading your order…</p> : items.length === 0 ? (
        <div className="order-summary-empty">
          <ShoppingBag className="size-9 text-muted-foreground" aria-hidden="true" />
          <p className="font-semibold">Something delicious starts here</p>
          <p className="text-sm leading-relaxed text-muted-foreground">Add a dish from the menu. Your order and total will appear here.</p>
        </div>
      ) : (
        <>
          {previewItems && <>
            <p className="text-sm text-muted-foreground">From <span className="font-medium text-foreground">{restaurantName}</span></p>
            <ul className="order-preview-list">
              {items.map(item => <li key={item.menu_item_id} className="flex items-start gap-3 text-sm">
                <span className="order-preview-quantity tabular-nums">{item.quantity}</span>
                <span className="min-w-0 break-words">{item.name}</span>
              </li>)}
            </ul>
            <Separator />
          </>}
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1"><dt className="text-muted-foreground">Subtotal</dt><dd className="min-w-0 break-words tabular-nums">{formatPrice(subtotal)}</dd></div>
            <div className="flex flex-wrap justify-between gap-x-4 gap-y-1"><dt className="text-muted-foreground">Delivery fee</dt><dd className="min-w-0 break-words tabular-nums">{deliveryFee > 0 ? formatPrice(deliveryFee) : "Free"}</dd></div>
          </dl>
          <Separator />
          <div className="flex flex-wrap justify-between gap-3 text-xl font-semibold"><span>Total</span><span className="tabular-nums">{formatPrice(total)}</span></div>
          <Button asChild size="lg" className={destination === "checkout" ? "order-summary-checkout hidden rounded-xl lg:inline-flex" : "rounded-xl"}>
            <Link href={destination === "cart" ? "/cart" : "/checkout"}>{destination === "cart" ? `View cart (${itemCount})` : "Continue to checkout"}</Link>
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">Food and delivery included. Review your address at checkout.</p>
        </>
      )}
    </section>
  );
}
