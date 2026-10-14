import Link from "next/link";
import Image from "next/image";
import { FoodBanner } from "@/components/customer/food-banner";
import { CUISINE_PHOTOS } from "@/lib/cuisine-photography";
import {
  ArrowRight,
  Bike,
  CreditCard,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/primitives/button";
import { FieldGroup, Field, FieldLabel } from "@/components/ui/primitives/field";


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
    <div className="landing-surface min-h-screen bg-light-bg">
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
        <div className="mx-auto max-w-6xl px-4 pb-2 pt-6 sm:px-6 sm:pt-8">
          <FoodBanner headingId="landing-heading" title={<>Abia flavours.<br />At your door.</>} description="Jollof rice, pepper soup, shawarma. Choose a restaurant in your city and order what you’re hungry for.">
            <form action="/restaurants">
              <FieldGroup className="gap-3 sm:flex-row sm:items-end">
                <Field className="flex-1"><FieldLabel htmlFor="landing-city">Choose your city</FieldLabel><select id="landing-city" name="city" defaultValue="aba" className="ui-native-select"><option value="aba">Aba</option><option value="umuahia">Umuahia</option></select></Field>
                <Button type="submit"><Search data-icon="inline-start" aria-hidden="true" />Find restaurants</Button>
              </FieldGroup>
            </form>
            <p className="mt-3 text-xs leading-relaxed text-gray-600">Browse first. Review your food and delivery total at checkout.</p>
          </FoodBanner>
        </div>
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
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
            {CRAVINGS.map((category) => {

              return (
                <Link
                  key={category.tag}
                  href={`/restaurants?tag=${category.tag}`}
                  className="ui-press overflow-hidden rounded-2xl"
                >
                  <span className="relative block aspect-[4/3] overflow-hidden rounded-2xl"><Image src={CUISINE_PHOTOS[category.tag]} alt="" fill sizes="(min-width: 640px) 170px, 33vw" className="object-cover" /></span>
                  <span className="block px-2 py-3 text-center text-sm font-medium leading-snug">{category.name}</span>
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
