"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, ShoppingBag, User } from "lucide-react";
import { useCart } from "@/contexts/cart-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/home", label: "Home", icon: Home },
  { href: "/restaurants", label: "Explore", icon: Search },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  return (
    <nav
      aria-label="Customer navigation"
      className="customer-dock"
    >
      <div className="customer-dock-inner">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            pathname === href ||
            (href !== "/home" && pathname.startsWith(href));
          const isCart = href === "/cart";

          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              aria-label={
                isCart && itemCount > 0 ? `Cart, ${itemCount} items` : label
              }
              className={cn(
                "customer-dock-item ui-press",
                isActive
                  ? "is-active"
                  : "",
              )}
            >
              <div className="customer-dock-icon">
                <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                {isCart && itemCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-white text-[10px] font-bold text-gray-900 px-1">
                    {itemCount > 9 ? "9+" : itemCount}
                  </span>
                )}
              </div>
              <span className="text-xs font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
