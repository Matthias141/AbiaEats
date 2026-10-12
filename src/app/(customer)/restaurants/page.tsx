import { createClient } from "@/lib/supabase/server";
import { RestaurantList } from "@/components/customer/restaurant-list";
import { MOCK_RESTAURANTS } from "@/lib/mock-data";
import { formatCityName, normalizeCityValue } from "@/lib/discovery";
import Link from "next/link";
import type { RestaurantPublic } from "@/types/database";
import { ArrowLeft, MapPin } from "lucide-react";

export const metadata = {
  title: "Restaurants",
  description: "Browse restaurants in Aba and Umuahia",
};

export default async function RestaurantsPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string; q?: string; city?: string }>;
}) {
  const params = await searchParams;
  const city = normalizeCityValue(params.city);

  let restaurants: RestaurantPublic[];
  let demo = false;
  try {
    const supabase = await createClient();

    const query = supabase
      .from("restaurants_public")
      .select("*")
      .eq("is_active", true)
      .order("total_orders", { ascending: false });

    // Load both cities so client-side city switching can show all results.

    const { data, error } = await query;
    if (error) throw new Error("Restaurant catalog unavailable");
    restaurants = data ?? [];
  } catch {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Restaurant catalog unavailable");
    }
    restaurants = MOCK_RESTAURANTS;
    demo = true;
  }

  return (
    <main
      id="main-content"
      className="min-h-screen liquid-surface overflow-x-hidden pb-24"
    >
      {/* Header */}
      <div className="sticky top-0 z-40 liquid-glass-nav border-x-0 border-t-0">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/home"
                aria-label="Back to home"
                className="tap-target w-10 h-10 rounded-xl liquid-chip flex items-center justify-center hover:bg-white/80 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-gray-700" />
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">
                  Restaurants
                </h1>
                <div className="flex items-center gap-1 text-xs text-gray-600">
                  <MapPin className="w-3 h-3" />
                  <span>
                    {city ? `${formatCityName(city)}, Abia` : "Aba & Umuahia"}
                  </span>
                </div>
              </div>
            </div>
            <Link
              href="/auth/login"
              className="tap-target px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Log in
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
        {demo && <p className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Sample restaurants for development. Live availability and prices may differ.</p>}
        <RestaurantList
          restaurants={restaurants}
          activeTag={params.tag}
          searchQuery={params.q}
          activeCity={city ?? undefined}
        />
      </div>
    </main>
  );
}
