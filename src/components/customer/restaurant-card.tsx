import Image from "next/image";
import Link from "next/link";
import { Clock, MapPin, Star } from "lucide-react";
import { Badge } from "@/components/ui/primitives/badge";
import { Skeleton } from "@/components/ui/primitives/skeleton";
import { getCuisinePhoto } from "@/lib/cuisine-photography";
import { CuisineIcon } from "@/lib/cuisine-icons";
import { formatCityName } from "@/lib/discovery";
import { formatPrice } from "@/lib/utils";
import type { RestaurantPublic } from "@/types/database";

export function RestaurantCard({
  restaurant,
}: {
  restaurant: RestaurantPublic;
}) {
  const inspirationPhoto = getCuisinePhoto(restaurant.cuisine_tags);
  return (
    <Link
      href={`/restaurants/${restaurant.id}`}
      className="restaurant-card group"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-orange-50">
        {restaurant.cover_image_url || restaurant.image_url ? (
          <Image
            src={restaurant.cover_image_url || restaurant.image_url || ""}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="restaurant-card-image object-cover"
            loading="lazy"
          />
        ) : inspirationPhoto ? (
          <>
            <Image src={inspirationPhoto} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="restaurant-card-image object-cover" loading="lazy" />
            <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-medium text-gray-900">Cuisine inspiration</span>
          </>
        ) : (
          <div className="restaurant-card-image flex h-full items-center justify-center bg-[#f3ebe1]">
            <CuisineIcon
              tags={restaurant.cuisine_tags}
              className="size-14 text-brand-orange-dark"
            />
          </div>
        )}
        <Badge variant={restaurant.is_open ? "secondary" : "outline"} className="absolute left-3 top-3">
          {restaurant.is_open ? "Open now" : "Currently closed"}
        </Badge>
      </div>
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-body text-lg font-semibold leading-snug tracking-tight text-foreground">
            {restaurant.name}
          </h3>
          {restaurant.rating_count > 0 && (
            <span
              className="flex shrink-0 items-center gap-1 text-sm font-medium text-gray-900"
              aria-label={`${restaurant.average_rating.toFixed(1)} out of 5 from ${restaurant.rating_count} ratings`}
            >
              <Star
                className="size-3.5 fill-amber-400 text-amber-600"
                aria-hidden="true"
              />
              {restaurant.average_rating.toFixed(1)}
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {restaurant.cuisine_tags.slice(0, 3).join(" · ")}
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-gray-100 pt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            {restaurant.min_delivery_time}–{restaurant.max_delivery_time} min
          </span>
          <span
            className="tabular-nums"
          >
            {restaurant.delivery_fee === 0
              ? "Free delivery"
              : `${formatPrice(restaurant.delivery_fee)} delivery`}
          </span>
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" aria-hidden="true" />
            {formatCityName(restaurant.city)}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function RestaurantCardSkeleton() {
  return (
    <div className="restaurant-card" aria-hidden="true">
      <Skeleton className="aspect-[16/10]" />
      <div className="flex flex-col gap-3 p-5">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="mt-2 h-4 w-full" />
      </div>
    </div>
  );
}
