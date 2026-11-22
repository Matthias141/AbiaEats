"use client";
import { useState } from "react";
import { useCart } from "@/contexts/cart-context";
import { formatPrice } from "@/lib/utils";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/primitives/button";
import { OrderSummary } from "@/components/customer/order-summary";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription, EmptyContent } from "@/components/ui/primitives/empty";
import { Modal } from "@/components/ui/modal";
import { CuisineIcon } from "@/lib/cuisine-icons";

export default function CartPage() {
  const { isHydrated, items, restaurantName, total, itemCount, updateQuantity, clearCart } = useCart();
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const removedItem = items.find(item => item.menu_item_id === confirmRemove);
  return <main id="main-content" className={`customer-cart min-h-screen bg-light-bg ${items.length ? "pb-56" : "pb-28"}`}>
    <header className="eats-topbar"><div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-4 sm:px-6">
      <Button asChild variant="outline" size="icon" className="rounded-full"><Link href="/restaurants" aria-label="Back to restaurants"><ArrowLeft aria-hidden="true" /></Link></Button>
      <h1 className="text-xl font-semibold">Cart</h1><span className="ml-auto text-sm text-muted-foreground tabular-nums">{itemCount} {itemCount === 1 ? "item" : "items"}</span>
    </div></header>
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      {!isHydrated ? <p role="status" className="text-muted-foreground">Loading your cart…</p> : items.length === 0 ? <Empty><EmptyHeader><EmptyMedia variant="icon"><ShoppingBag aria-hidden="true" /></EmptyMedia><EmptyTitle><h2>Your cart is empty</h2></EmptyTitle><EmptyDescription>Choose a restaurant and add a meal to get started.</EmptyDescription></EmptyHeader><EmptyContent><Button asChild><Link href="/restaurants">Browse restaurants</Link></Button></EmptyContent></Empty> : <div className="order-layout">
        <div className="cart-items-column">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><p className="text-sm text-muted-foreground">Ordering from <span className="font-semibold text-foreground">{restaurantName}</span></p><Button variant="outline" size="sm" onClick={() => setConfirmClear(true)}><Trash2 data-icon="inline-start" aria-hidden="true" />Clear cart</Button></div>
        <div className="flex flex-col gap-4">
          {items.map(item => <article key={item.menu_item_id} className="cart-food-row">
            <div className="cart-item-photo relative overflow-hidden rounded-xl bg-muted">
              {item.image_url ? <Image src={item.image_url} alt="" fill sizes="80px" className="food-photo object-cover" /> : <CuisineIcon className="size-full" />}
            </div>
            <div className="min-w-0"><h2 className="break-words text-base font-semibold leading-relaxed">{item.name}</h2><p className="mt-1 text-sm text-muted-foreground tabular-nums">{formatPrice(item.price)} each</p></div>
            <div className="cart-item-controls flex flex-wrap items-center justify-end gap-3">
              <Button variant="outline" size="icon" className="rounded-full" aria-label={`Decrease ${item.name} quantity`} disabled={item.quantity <= 1} onClick={() => updateQuantity(item.menu_item_id, item.quantity - 1)}><Minus aria-hidden="true" /></Button>
              <span className="w-6 text-center font-semibold tabular-nums" aria-live="polite">{item.quantity}</span>
              <Button variant="outline" size="icon" className="rounded-full" aria-label={`Increase ${item.name} quantity`} disabled={item.quantity >= 20} onClick={() => updateQuantity(item.menu_item_id, item.quantity + 1)}><Plus aria-hidden="true" /></Button>
              <Button variant="ghost" size="icon" className="rounded-full" aria-label={`Remove ${item.name}`} onClick={() => setConfirmRemove(item.menu_item_id)}><Trash2 aria-hidden="true" /></Button>
            </div>
          </article>)}
        </div>
        </div>
        <OrderSummary id="summary-heading" />
      </div>}
    </div>
    {isHydrated && items.length > 0 && <div className="cart-checkout-bar">
      <div className="min-w-0"><p className="text-xs text-muted-foreground">Total, including delivery</p><p className="break-words text-lg font-semibold tabular-nums">{formatPrice(total)}</p></div>
      <Button asChild className="rounded-xl px-2"><Link href="/checkout" aria-label="Continue to checkout">Checkout</Link></Button>
    </div>}
    <Modal className="customer-dialog" isOpen={confirmClear || Boolean(removedItem)} onClose={() => { setConfirmClear(false); setConfirmRemove(null); }} title={removedItem ? `Remove ${removedItem.name}?` : "Clear your cart?"}>
      <p className="text-muted-foreground">{removedItem ? `This removes ${removedItem.quantity} ${removedItem.quantity === 1 ? "portion" : "portions"} from your cart.` : `This removes all ${itemCount} ${itemCount === 1 ? "item" : "items"} from your cart.`} You can add them again from the restaurant menu.</p>
      <div className="flex flex-col gap-3 sm:flex-row"><Button variant="outline" onClick={() => { setConfirmClear(false); setConfirmRemove(null); }}>Keep cart</Button><Button variant="destructive" onClick={() => { if (removedItem) updateQuantity(removedItem.menu_item_id, 0); else clearCart(); setConfirmClear(false); setConfirmRemove(null); }}>{removedItem ? "Remove item" : "Clear cart"}</Button></div>
    </Modal>
  </main>;
}
