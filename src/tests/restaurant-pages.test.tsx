import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import RestaurantsPage from "@/app/(customer)/restaurants/page";
import RestaurantPage from "@/app/(customer)/restaurants/[id]/page";
import { MOCK_RESTAURANTS } from "@/lib/mock-data";

const state = vi.hoisted(() => ({
  rows: [] as unknown[], restaurant: null as unknown, menu: [] as unknown[],
  catalogError: false, menuError: false,
  from: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ from: state.from }) }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("NOT_FOUND"); } }));
vi.mock("@/components/customer/restaurant-list", () => ({ RestaurantList: ({ restaurants }: { restaurants: { id: string }[] }) => <p>{restaurants.map(r => r.id).join(",")}</p> }));
vi.mock("@/components/customer/restaurant-detail", () => ({ RestaurantDetail: ({ restaurant, menuItems }: { restaurant: { name: string }; menuItems: { name: string }[] }) => <p>{restaurant.name}: {menuItems.map(m => m.name).join(",")}</p> }));

beforeEach(() => {
  vi.stubEnv("NODE_ENV", "production");
  state.rows = []; state.restaurant = null; state.menu = []; state.catalogError = false; state.menuError = false;
  state.from.mockReset().mockImplementation((table: string) => {
    const result = { data: table === "menu_items" ? state.menu : state.rows, error: (table === "menu_items" ? state.menuError : state.catalogError) ? { message: "fixture outage" } : null };
    const query = {
      select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
      order: vi.fn(async () => result),
      maybeSingle: vi.fn(async () => ({ ...result, data: state.restaurant })),
    };
    return query;
  });
});
afterEach(() => vi.unstubAllEnvs());
const listing = () => RestaurantsPage({ searchParams: Promise.resolve({}) });
const detail = (id = "00000000-0000-4000-8000-000000000001") => RestaurantPage({ params: Promise.resolve({ id }) });

describe("production restaurant catalog consistency", () => {
  it("keeps an empty catalog empty instead of creating unresolvable sample links", async () => {
    const html = renderToStaticMarkup(await listing());
    expect(html).not.toContain("mock-mama-put");
  });
  it("surfaces catalog outages instead of publishing sample restaurants", async () => {
    state.catalogError = true;
    await expect(listing()).rejects.toThrow("Restaurant catalog unavailable");
  });
  it("renders the database restaurant IDs", async () => {
    state.rows = [{ ...MOCK_RESTAURANTS[0], id: "00000000-0000-4000-8000-000000000001" }];
    expect(renderToStaticMarkup(await listing())).toContain("00000000-0000-4000-8000-000000000001");
  });
  it("rejects legacy sample links without querying the database", async () => {
    await expect(detail("mock-mama-put")).rejects.toThrow("NOT_FOUND");
    expect(state.from).not.toHaveBeenCalled();
  });
  it("returns 404 for a genuinely missing restaurant", async () => {
    await expect(detail()).rejects.toThrow("NOT_FOUND");
  });
  it("keeps database failures distinct from missing restaurants", async () => {
    state.catalogError = true;
    await expect(detail()).rejects.toThrow("Restaurant or menu unavailable");
  });
  it("does not disguise a menu outage as an empty menu", async () => {
    state.restaurant = MOCK_RESTAURANTS[0]; state.menuError = true;
    await expect(detail()).rejects.toThrow("Restaurant or menu unavailable");
  });
  it("renders a real restaurant and its loaded menu", async () => {
    state.restaurant = MOCK_RESTAURANTS[0]; state.menu = [{ name: "Jollof" }];
    expect(renderToStaticMarkup(await detail())).toContain("Mama Put Kitchen: Jollof");
  });
});
