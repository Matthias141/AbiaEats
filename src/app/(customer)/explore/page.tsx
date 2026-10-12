import { redirect } from "next/navigation";

/** Keep bookmarked/shared Explore URLs working alongside /restaurants. */
export default async function ExplorePage({ searchParams }: {
  searchParams: Promise<{ city?: string; tag?: string; q?: string }>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const key of ["city", "tag", "q"] as const) {
    if (typeof params[key] === "string") query.set(key, params[key]);
  }
  redirect(`/restaurants${query.size ? `?${query}` : ""}`);
}
