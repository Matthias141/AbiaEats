import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bike,
  CreditCard,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/primitives/button";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/primitives/field";
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
            className="font-brand text-2xl font-semibold tracking-tight text-[#311b12]"
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
            <Button asChild variant="secondary" size="sm"><Link href="/home">
              Find food
              <ArrowRight
                data-icon="inline-end"
                className="hidden sm:block"
                aria-hidden="true"
              />
            </Link></Button>
          </div>
        </nav>
      </header>
      <main id="main-content">
        <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pb-8 pt-6 sm:px-6 sm:pb-12 sm:pt-12 lg:grid-cols-[1fr_1fr] lg:gap-12">
          <div>
            <h1 className="max-w-xl font-brand text-[clamp(2.125rem,5.5vw,4.25rem)] font-semibold leading-[1.1] tracking-[-.02em] text-foreground">
              Your favourites.
              <br />
              Delivered in Abia.
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground sm:text-lg">
              Jollof rice, pepper soup, shawarma. Choose a restaurant in
              your city and order what you’re hungry for.
            </p>
            <form action="/restaurants" className="mt-6">
              <FieldGroup className="gap-3 sm:flex-row sm:items-end">
                <Field className="flex-1">
                  <FieldLabel htmlFor="landing-city">Choose your city</FieldLabel>
                  <select id="landing-city" name="city" defaultValue="aba" className="ui-native-select">
                    <option value="aba">Aba</option><option value="umuahia">Umuahia</option>
                  </select>
                </Field>
                <Button type="submit"><Search data-icon="inline-start" aria-hidden="true" />Find restaurants</Button>
              </FieldGroup>
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
                className="food-photo object-cover"
              />
            </div>

          </div>
        </section>
        <section
          className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12"
          aria-labelledby="cravings-heading"
        >
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2
                id="cravings-heading"
                className="text-2xl tracking-tight sm:text-3xl"
              >
                What are you hungry for?
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Browse by food.
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
          <div className="grid grid-cols-3 gap-x-3 gap-y-2 sm:grid-cols-6">
            {CRAVINGS.map((category) => {
              const Icon = getCuisineIcon(category.tag);
              return (
                <Link
                  key={category.tag}
                  href={`/restaurants?tag=${category.tag}`}
                  className="cuisine-tile ui-press"
                >
                  <span className="cuisine-tile-icon"><Icon aria-hidden="true" /></span>
                  <span>{category.name}</span>
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
                  title: "Receive your meal",
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
