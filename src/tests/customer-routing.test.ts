import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { getCustomerLoginRedirect } from "@/lib/customer-login-redirect";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({ auth: { getUser: vi.fn(async () => ({ data: { user: null }, error: null })) } })),
}));

describe("guest browsing boundary", () => {
  beforeEach(() => vi.clearAllMocks());
  it.each(["/cart", "/explore", "/restaurants", "/restaurants/example"])("allows %s without sign-in", async path => {
    const response = await updateSession(new NextRequest(`https://example.test${path}`));
    expect(response.headers.get("location")).toBeNull();
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });
  it.each(["/checkout", "/profile", "/admin", "/restaurant/menu", "/dashboard/ops", "/cart/private"])("keeps %s protected", async path => {
    const response = await updateSession(new NextRequest(`https://example.test${path}`));
    const url = new URL(response.headers.get("location")!);
    expect(url.pathname).toBe("/auth/login");
    expect(url.searchParams.get("redirectTo")).toBe(path);
  });
});

describe("safe sign-in return", () => {
  it("returns to checkout after sign-in", () => expect(getCustomerLoginRedirect("/checkout")).toBe("/checkout"));
  it.each([null, "https://evil.test", "//evil.test", "/checkout?next=https://evil.test", "/admin", "javascript:alert(1)"])("rejects unknown or unsafe destination %s", target => {
    expect(getCustomerLoginRedirect(target)).toBe("/home");
  });
});
