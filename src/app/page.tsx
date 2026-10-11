import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bike,
  CreditCard,
  MapPin,
  Search,
  UtensilsCrossed,
} from "lucide-react";
import { getCuisineIcon } from "@/lib/cuisine-icons";

const CRAVINGS = [
  { name: "Jollof & rice", tag: "rice-dishes", note: "The everyday favourite" },
  {
    name: "Pepper soup",
    tag: "pepper-soup",
    note: "A little heat, a lot of flavour",
  },
  { name: "Grills & BBQ", tag: "grills", note: "Straight from the flame" },
  { name: "Shawarma", tag: "shawarma", note: "For cravings on the go" },
  { name: "Local dishes", tag: "local", note: "A taste of home" },
  { name: "Drinks", tag: "drinks", note: "Something refreshing" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-light-bg">
      <header className="eats-topbar">
        <nav
          aria-label="Main navigation"
          className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-6"
        >
          <Link
            href="/"
            aria-label="Abia Eats home"
            className="font-body text-2xl font-semibold tracking-tight text-[#311b12]"
          >
            abia<span className="text-brand-orange-dark">eats</span>
            <span className="text-brand-orange">.</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-6">
            <Link
              href="/restaurants"
              className="hidden min-h-11 items-center text-sm font-medium text-gray-700 sm:inline-flex"
            >
              Explore restaurants
            </Link>
            <Link
              href="/auth/login"
              className="inline-flex min-h-11 items-center text-sm font-medium text-gray-700"
            >
              Log in
            </Link>
            <Link href="/home" className="eats-button">
              Find food
              <ArrowRight
                className="hidden size-4 sm:block"
                aria-hidden="true"
              />
            </Link>
          </div>
        </nav>
      </header>
      <main id="main-content">
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-10 pt-8 sm:px-6 sm:pb-16 sm:pt-14 lg:grid-cols-[1fr_1fr] lg:gap-12">
          <div>
            <p className="mb-6 flex items-center gap-2 text-sm font-medium text-[#674739]">
              <MapPin
                className="size-4 text-brand-orange-dark"
                aria-hidden="true"
              />
              Made for Aba & Umuahia
            </p>
            <h1 className="max-w-xl text-[clamp(2.75rem,6vw,4.8rem)] font-semibold leading-[1.04] tracking-[-.04em] text-[#311b12]">
              A taste of home.
              <br />
              Delivered.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[#674739] sm:text-lg">
              From your go-to jollof spot to the pepper soup you’ve been
              thinking about. Find your next meal at a local kitchen.
            </p>
            <form
              action="/restaurants"
              className="premium-search-panel mt-8 rounded-2xl p-2"
            >
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="flex min-h-12 flex-1 items-center gap-3 px-3">
                  <MapPin
                    className="size-5 shrink-0 text-brand-orange-dark"
                    aria-hidden="true"
                  />
                  <label htmlFor="landing-city" className="sr-only">
                    Your city
                  </label>
                  <select
                    id="landing-city"
                    name="city"
                    defaultValue="aba"
                    className="min-h-11 w-full bg-white text-base text-gray-900"
                  >
                    <option value="aba">Aba</option>
                    <option value="umuahia">Umuahia</option>
                  </select>
                </div>
                <button type="submit" className="eats-button rounded-xl">
                  <Search className="size-4" aria-hidden="true" />
                  Find restaurants
                </button>
              </div>
            </form>
            <p className="mt-4 text-xs leading-relaxed text-gray-600">
              Browse first. Add your delivery address and review the total at
              checkout.
            </p>
          </div>
          <div className="relative">
            <div className="premium-image-frame relative aspect-square overflow-hidden rounded-[2.5rem] bg-[#ffe5d2]">
              <Image
                src="/images/jollof-hero.webp"
                alt="A bowl of Nigerian jollof rice, grilled chicken, and fried plantain"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 550px"
                className="object-cover transition-transform duration-700 hover:scale-[1.025]"
              />
            </div>
            <div className="premium-float absolute -bottom-4 left-4 right-4 flex items-center gap-3 rounded-2xl p-4 sm:left-6 sm:right-auto sm:max-w-[20rem]">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-orange-100 text-brand-orange-dark">
                <UtensilsCrossed className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-[#311b12]">
                  Big on local flavour.
                </p>
                <p className="mt-0.5 text-xs text-gray-600">
                  Discover the kitchens in your city.
                </p>
              </div>
            </div>
          </div>
        </section>
        <section
          className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
          aria-labelledby="cravings-heading"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="cravings-heading"
                className="text-3xl tracking-tight sm:text-4xl"
              >
                Follow your cravings.
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                A little inspiration for your next order.
              </p>
            </div>
            <Link
              href="/restaurants"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-orange-dark"
            >
              Explore all
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CRAVINGS.map((category) => {
              const Icon = getCuisineIcon(category.tag);
              return (
                <Link
                  key={category.tag}
                  href={`/restaurants?tag=${category.tag}`}
                  className="premium-card group flex items-center gap-4 rounded-2xl p-5 active:scale-[0.985]"
                >
                  <span className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#fff0e4] text-brand-orange-dark">
                    <Icon
                      className="size-11"
                      aria-hidden="true"
                    />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="font-body text-base font-semibold text-[#311b12]">
                      {category.name}
                    </h3>
                    <p className="mt-1 text-xs leading-relaxed text-gray-600">
                      {category.note}
                    </p>
                  </div>
                  <ArrowRight
                    className="size-4 shrink-0 text-gray-500 transition-transform duration-200"
                    aria-hidden="true"
                  />
                </Link>
              );
            })}
          </div>
        </section>
        <section className="border-y border-[#e8e3dd] bg-white px-4 py-12 sm:px-6 sm:py-16">
          <div className="mx-auto max-w-6xl">
            <h2 className="mb-8 text-3xl tracking-tight sm:text-4xl">
              From their kitchen to your door.
            </h2>
            <ol className="grid gap-8 sm:grid-cols-3">
              {[
                {
                  icon: Search,
                  title: "Find your food",
                  text: "Choose your city, explore local restaurants, and build your order.",
                },
                {
                  icon: CreditCard,
                  title: "Review & pay",
                  text: "See your total and follow the payment instructions. Preparation starts after verification.",
                },
                {
                  icon: Bike,
                  title: "Make room at the table",
                  text: "Your restaurant prepares your meal and sends its rider to your delivery address.",
                },
              ].map((step, index) => (
                <li key={step.title}>
                  <div className="mb-4 flex items-center gap-3">
                    <step.icon
                      className="size-6 text-brand-orange-dark"
                      aria-hidden="true"
                    />
                    <span className="text-xs text-gray-600">
                      Step {index + 1}
                    </span>
                  </div>
                  <h3 className="font-body text-lg font-semibold">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-sm text-sm leading-relaxed text-gray-600">
                    {step.text}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl bg-[#311b12] p-7 text-white sm:flex-row sm:items-center sm:p-10">
            <div>
              <h2 className="text-3xl leading-tight sm:text-4xl">
                Your next favourite is nearby.
              </h2>
              <p className="mt-3 text-sm text-[#e6cdc0]">
                Explore Aba and Umuahia, one kitchen at a time.
              </p>
            </div>
            <Link
              href="/home"
              className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-semibold text-[#311b12]"
            >
              Let’s find food
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </main>
      <footer className="border-t border-[#e8e3dd] px-4 py-7 sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 text-sm text-gray-600">
          <p>© {new Date().getFullYear()} AbiaEats · Made for Abia.</p>
          <div className="flex flex-wrap gap-5">
            <Link
              href="/restaurant/apply"
              className="inline-flex min-h-11 items-center"
            >
              Join as a restaurant
            </Link>
            <Link
              href="/privacy-policy"
              className="inline-flex min-h-11 items-center"
            >
              Privacy policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
