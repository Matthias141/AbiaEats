import Link from 'next/link';
import {
  MapPin,
  Clock,
  Shield,
  ChevronRight,
  Star,
  Utensils,
  Bike,
  CreditCard,
} from 'lucide-react';

const FEATURED_CATEGORIES = [
  { name: 'Jollof Rice', emoji: '🍚', slug: 'jollof' },
  { name: 'Pepper Soup', emoji: '🍲', slug: 'pepper-soup' },
  { name: 'Grills & BBQ', emoji: '🍖', slug: 'grills' },
  { name: 'Shawarma', emoji: '🌯', slug: 'shawarma' },
  { name: 'Drinks', emoji: '🥤', slug: 'drinks' },
  { name: 'Local Dishes', emoji: '🥘', slug: 'local' },
];

const HOW_IT_WORKS = [
  {
    icon: Utensils,
    title: 'Choose Your Food',
    description: 'Browse restaurants near you and pick your favorite meals',
    step: '01',
  },
  {
    icon: CreditCard,
    title: 'Pay Securely',
    description: 'Transfer via OPay — no cash, no wahala. Payment verified instantly',
    step: '02',
  },
  {
    icon: Bike,
    title: 'Get It Delivered',
    description: 'Restaurant prepares your food and dispatches their rider to you',
    step: '03',
  },
];

const SAMPLE_RESTAURANTS = [
  {
    name: 'Mama Put Kitchen',
    cuisine: 'Nigerian Local',
    rating: 4.8,
    deliveryTime: '25-35',
    deliveryFee: 500,
    tags: ['Local', 'Rice', 'Soup'],
    emoji: '🥘',
  },
  {
    name: 'Aba Grills & Shawarma',
    cuisine: 'Fast Food',
    rating: 4.6,
    deliveryTime: '20-30',
    deliveryFee: 400,
    tags: ['Grills', 'Shawarma', 'Drinks'],
    emoji: '🍖',
  },
  {
    name: 'Nkwobi Palace',
    cuisine: 'Traditional',
    rating: 4.9,
    deliveryTime: '30-45',
    deliveryFee: 600,
    tags: ['Nkwobi', 'Pepper Soup', 'Local'],
    emoji: '🍲',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white overflow-x-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-100 backdrop-blur-xl bg-white/90">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg gradient-orange flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Abia<span className="text-brand-orange">Eats</span>
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="tap-target px-4 py-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/onboarding"
              className="tap-target px-5 py-2.5 text-sm font-medium rounded-xl gradient-orange text-white shadow-lg shadow-brand-orange/20 hover:shadow-brand-orange/30 transition-all active:scale-[0.97]"
            >
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28 px-4 sm:px-6">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-orange-50 blur-[120px] pointer-events-none" />

        <div className="max-w-6xl mx-auto relative">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-100 mb-8 animate-fade-in">
              <MapPin className="w-4 h-4 text-brand-orange" />
              <span className="text-sm text-gray-500">
                Delivering in <span className="text-gray-900 font-medium">Aba</span> &{' '}
                <span className="text-gray-900 font-medium">Umuahia</span>
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-6 text-gray-900 animate-slide-up">
              Delicious Food,{' '}
              <span className="text-gradient-orange">Delivered</span> to Your
              Door
            </h1>

            <p className="text-lg sm:text-xl text-gray-500 leading-relaxed mb-10 max-w-lg animate-slide-up">
              Order from the best local restaurants in Abia State. Fast delivery, verified payments, amazing flavors.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up">
              <Link
                href="/onboarding"
                className="tap-target inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium rounded-xl gradient-orange text-white shadow-lg shadow-brand-orange/20 hover:shadow-brand-orange/30 transition-all active:scale-[0.97]"
              >
                Order Now
                <ChevronRight className="w-5 h-5" />
              </Link>
              <Link
                href="/onboarding"
                className="tap-target inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-medium rounded-xl border border-gray-200 text-gray-700 hover:border-brand-orange hover:text-brand-orange transition-all active:scale-[0.97]"
              >
                Create Account
              </Link>
            </div>

            <div className="flex items-center gap-6 mt-10 text-sm text-gray-400 animate-fade-in">
              <div className="flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-green-500" />
                <span>Verified payments</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-brand-orange" />
                <span>25-45 min delivery</span>
              </div>
            </div>
          </div>

          <div className="mt-16 sm:mt-0 sm:absolute sm:right-0 sm:top-0 sm:w-[45%] lg:w-[40%]">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-3">
                <div className="aspect-square rounded-2xl bg-orange-50 border border-orange-100 overflow-hidden flex items-center justify-center text-6xl">
                  🍛
                </div>
                <div className="aspect-[4/3] rounded-2xl bg-amber-50 border border-amber-100 overflow-hidden flex items-center justify-center text-5xl">
                  🍖
                </div>
              </div>
              <div className="space-y-3 pt-8">
                <div className="aspect-[4/3] rounded-2xl bg-red-50 border border-red-100 overflow-hidden flex items-center justify-center text-5xl">
                  🥘
                </div>
                <div className="aspect-square rounded-2xl bg-yellow-50 border border-yellow-100 overflow-hidden flex items-center justify-center text-6xl">
                  🍲
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-8">
            What are you craving?
          </h2>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            {FEATURED_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/restaurants?tag=${cat.slug}`}
                className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white card-shadow hover:card-shadow-md transition-all active:scale-[0.97] group"
              >
                <span className="text-3xl group-hover:scale-110 transition-transform">
                  {cat.emoji}
                </span>
                <span className="text-xs sm:text-sm font-medium text-gray-600 group-hover:text-gray-900 text-center">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Restaurants Preview */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">
              Popular Restaurants
            </h2>
            <Link
              href="/onboarding"
              className="text-sm text-brand-orange hover:text-brand-orange-light flex items-center gap-1 transition-colors"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SAMPLE_RESTAURANTS.map((restaurant) => (
              <div
                key={restaurant.name}
                className="group rounded-2xl bg-white card-shadow overflow-hidden hover:card-shadow-md transition-all"
              >
                <div className="aspect-video bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
                  <span className="text-5xl opacity-50">{restaurant.emoji}</span>
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-semibold text-gray-900 group-hover:text-brand-orange transition-colors">
                        {restaurant.name}
                      </h3>
                      <p className="text-xs text-gray-500">{restaurant.cuisine}</p>
                    </div>
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 text-xs font-medium">
                      <Star className="w-3 h-3 fill-current" />
                      {restaurant.rating}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {restaurant.deliveryTime} min
                    </span>
                    <span>
                      ₦{restaurant.deliveryFee.toLocaleString()} delivery
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {restaurant.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 rounded-full bg-gray-100 text-xs text-gray-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">
              How AbiaEats Works
            </h2>
            <p className="text-gray-500 max-w-md mx-auto">
              Three simple steps to get delicious food delivered to your doorstep
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step) => (
              <div
                key={step.step}
                className="relative p-6 rounded-2xl bg-white card-shadow group hover:card-shadow-md transition-all"
              >
                <span className="absolute top-4 right-4 font-mono text-4xl font-bold text-gray-100 group-hover:text-orange-100 transition-colors">
                  {step.step}
                </span>
                <div className="w-12 h-12 rounded-xl gradient-orange flex items-center justify-center mb-4">
                  <step.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {step.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="relative rounded-3xl overflow-hidden p-8 sm:p-12 gradient-orange">
            <div className="relative max-w-lg">
              <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
                Hungry? Your favorite food is just a tap away
              </h2>
              <p className="text-white/80 mb-8">
                Join thousands of food lovers in Aba and Umuahia ordering from the best local restaurants.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/onboarding"
                  className="tap-target inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-medium rounded-xl bg-white text-brand-orange hover:bg-white/90 transition-all active:scale-[0.97]"
                >
                  Browse Restaurants
                </Link>
                <Link
                  href="/onboarding"
                  className="tap-target inline-flex items-center justify-center gap-2 px-8 py-3.5 text-base font-medium rounded-xl border-2 border-white/30 text-white hover:bg-white/10 transition-all active:scale-[0.97]"
                >
                  Sign Up Free
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-12 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg gradient-orange flex items-center justify-center">
                  <span className="text-white font-bold text-sm">A</span>
                </div>
                <span className="text-xl font-bold text-gray-900">
                  Abia<span className="text-brand-orange">Eats</span>
                </span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Connecting Aba and Umuahia to the best local restaurants. Fast delivery, verified payments.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Quick Links</h4>
              <div className="space-y-2 text-sm text-gray-500">
                <Link href="/onboarding" className="block hover:text-brand-orange transition-colors">
                  Restaurants
                </Link>
                <Link href="/onboarding" className="block hover:text-brand-orange transition-colors">
                  Sign Up
                </Link>
                <Link href="/auth/login" className="block hover:text-brand-orange transition-colors">
                  Log In
                </Link>
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-gray-900 mb-4">Contact</h4>
              <div className="space-y-2 text-sm text-gray-500">
                <p>Aba, Abia State, Nigeria</p>
                <p>hello@abiaeats.com</p>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-6 text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} AbiaEats. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
