// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { RestaurantList } from "@/components/customer/restaurant-list";
import { MOCK_RESTAURANTS } from "@/lib/mock-data";

afterEach(() => {
  cleanup();
  document.body.style.overflow = "";
});

describe("Shared accessible controls", () => {
  it("associates generated input labels and errors without discarding help text", () => {
    render(
      <>
        <p id="help">Use your delivery phone number.</p>
        <Input
          label="Phone"
          error="Enter a valid phone number"
          aria-describedby="help"
        />
      </>,
    );
    const input = screen.getByLabelText("Phone");
    expect(input.getAttribute("aria-invalid")).toBe("true");
    const describedBy = input.getAttribute("aria-describedby")!.split(" ");
    expect(describedBy).toContain("help");
    expect(document.getElementById(describedBy[1])?.textContent).toBe(
      "Enter a valid phone number",
    );
  });
  it("does not accidentally submit forms, but preserves explicit submit behavior", () => {
    const { rerender } = render(<Button>Continue</Button>);
    expect(screen.getByRole("button").getAttribute("type")).toBe("button");
    rerender(
      <Button type="submit" isLoading>
        Pay
      </Button>,
    );
    expect(screen.getByRole("button").getAttribute("type")).toBe("submit");
    expect(screen.getByRole("button").getAttribute("aria-busy")).toBe("true");
    expect((screen.getByRole("button") as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
  it("names dialogs, handles cancellation, and restores the previous scroll state", () => {
    document.body.style.overflow = "scroll";
    const close = vi.fn();
    const { unmount } = render(
      <Modal isOpen onClose={close} title="Choose your city">
        <button>Aba</button>
      </Modal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Choose your city" });
    expect(document.body.style.overflow).toBe("hidden");
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    expect(close).toHaveBeenCalledOnce();
    unmount();
    expect(document.body.style.overflow).toBe("scroll");
  });
});

describe("Restaurant discovery", () => {
  it("switches from an initial city to all cities and combines cuisine/search filters", () => {
    render(<RestaurantList restaurants={MOCK_RESTAURANTS} activeCity="aba" />);
    const umuahiaRestaurant = MOCK_RESTAURANTS.find(
      (restaurant) => restaurant.city === "umuahia",
    )!;
    expect(umuahiaRestaurant).toBeDefined();
    expect(
      screen.queryByRole("heading", { name: umuahiaRestaurant.name }),
    ).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "All cities" }));
    expect(
      screen.getByRole("heading", { name: umuahiaRestaurant.name }),
    ).toBeDefined();
    fireEvent.change(screen.getByLabelText("Search restaurants and cuisines"), {
      target: { value: "does not exist" },
    });
    expect(
      screen.getByRole("heading", { name: "No restaurants found" }),
    ).toBeDefined();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(
      (
        screen.getByLabelText(
          "Search restaurants and cuisines",
        ) as HTMLInputElement
      ).value,
    ).toBe("");
    expect(
      screen
        .getByRole("radio", { name: "All cities" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByRole("heading", { name: umuahiaRestaurant.name }),
    ).toBeDefined();
  });
});
