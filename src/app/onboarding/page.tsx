'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronRight, MapPin, ArrowRight, UtensilsCrossed } from 'lucide-react';

/* ============================================================================
   Onboarding Flow — 3 Steps
   1. Splash carousel (3 slides)
   2. City selection (Aba / Umuahia)
   3. Auth prompt (Sign Up / Log In / Skip)
   ============================================================================ */

const SLIDES = [
  {
    emoji: '\u{1F35B}',
    title: 'Delicious Food, Delivered',
    subtitle:
      'Order from the best restaurants in Aba & Umuahia. Fast, reliable, no wahala.',
  },
  {
    emoji: '\u{1F4B3}',
    title: 'Pay With Ease',
    subtitle:
      'Secure payments via OPay transfer. No cash needed \u2014 every order verified.',
  },
  {
    emoji: '\u{1F680}',
    title: 'Track Your Order',
    subtitle:
      'Real-time updates from kitchen to your doorstep. Know exactly when to expect your food.',
  },
] as const;

const CITIES = [
  { name: 'Aba', hint: '1.5M+ people' },
  { name: 'Umuahia', hint: 'State Capital' },
] as const;

type Step = 'carousel' | 'city' | 'auth';

export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep] = useState<Step>('carousel');
  const [slideIndex, setSlideIndex] = useState(0);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [transitioning, setTransitioning] = useState(false);
  const [slideKey, setSlideKey] = useState(0);

  // Redirect if onboarding already complete
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const done = localStorage.getItem('abiaeats_onboarding_complete');
      if (done === 'true') {
        router.replace('/home');
      }
    }
  }, [router]);

  const animateTransition = useCallback((next: () => void) => {
    setTransitioning(true);
    // Brief fade-out, then switch, then fade-in via animate-slide-in-right
    setTimeout(() => {
      next();
      setTransitioning(false);
    }, 150);
  }, []);

  const handleNextSlide = () => {
    if (slideIndex < SLIDES.length - 1) {
      animateTransition(() => {
        setSlideIndex((i) => i + 1);
        setSlideKey((k) => k + 1);
      });
    } else {
      animateTransition(() => setStep('city'));
    }
  };

  const handleCitySelect = (city: string) => {
    setSelectedCity(city);
  };

  const handleCityContinue = () => {
    if (!selectedCity) return;
    animateTransition(() => setStep('auth'));
  };

  const completeOnboarding = (redirect: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('abiaeats_onboarding_complete', 'true');
      if (selectedCity) {
        localStorage.setItem('abiaeats_city', selectedCity);
      }
    }
    router.push(redirect);
  };

  return (
    <main className="min-h-dvh bg-dark-bg text-foreground flex items-center justify-center overflow-x-hidden">
      <div className="w-full max-w-[480px] mx-auto px-6 py-10 flex flex-col min-h-dvh">
        {/* ----------------------------------------------------------------
            STEP 1: Splash Carousel
        ---------------------------------------------------------------- */}
        {step === 'carousel' && (
          <div
            className={`flex flex-col flex-1 justify-between transition-opacity duration-150 ${
              transitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {/* Skip button */}
            <div className="flex justify-end">
              <button
                onClick={() => animateTransition(() => setStep('city'))}
                className="text-sm text-foreground/50 hover:text-foreground/80 transition-colors tap-target px-2"
              >
                Skip
              </button>
            </div>

            {/* Slide content */}
            <div
              key={slideKey}
              className="flex-1 flex flex-col items-center justify-center text-center animate-slide-in-right"
            >
              <div className="text-8xl mb-8">{SLIDES[slideIndex].emoji}</div>
              <h1 className="font-heading text-3xl font-bold mb-4 text-foreground">
                {SLIDES[slideIndex].title}
              </h1>
              <p className="text-foreground/60 text-base leading-relaxed max-w-[320px]">
                {SLIDES[slideIndex].subtitle}
              </p>
            </div>

            {/* Bottom: dots + next button */}
            <div className="flex flex-col items-center gap-8 pb-4">
              {/* Dots indicator */}
              <div className="flex items-center gap-2">
                {SLIDES.map((_, i) => (
                  <div
                    key={i}
                    className={`rounded-full transition-all duration-300 ${
                      i === slideIndex
                        ? 'w-8 h-2 bg-brand-orange'
                        : 'w-2 h-2 bg-foreground/20'
                    }`}
                  />
                ))}
              </div>

              {/* Next button */}
              <button
                onClick={handleNextSlide}
                className="gradient-orange w-full rounded-2xl py-4 text-white font-semibold text-lg
                           tap-target active:scale-[0.97] transition-transform duration-100
                           flex items-center justify-center gap-2 min-h-[44px]"
              >
                {slideIndex < SLIDES.length - 1 ? (
                  <>
                    Next
                    <ChevronRight className="w-5 h-5" />
                  </>
                ) : (
                  <>
                    Get Started
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------
            STEP 2: City Selection
        ---------------------------------------------------------------- */}
        {step === 'city' && (
          <div
            className={`flex flex-col flex-1 justify-between transition-opacity duration-150 ${
              transitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="animate-slide-in-right">
              {/* Header */}
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-brand-orange" />
                <span className="text-sm font-medium text-foreground/50 uppercase tracking-wider">
                  Location
                </span>
              </div>
              <h1 className="font-heading text-3xl font-bold mb-2 text-foreground">
                Where are we delivering to?
              </h1>
              <p className="text-foreground/50 text-base mb-10">
                Select your city to see nearby restaurants.
              </p>

              {/* City cards */}
              <div className="flex flex-col gap-4">
                {CITIES.map((city) => {
                  const isSelected = selectedCity === city.name;
                  return (
                    <button
                      key={city.name}
                      onClick={() => handleCitySelect(city.name)}
                      className={`w-full rounded-2xl p-5 text-left transition-all duration-200
                                  tap-target active:scale-[0.97] border-2
                                  ${
                                    isSelected
                                      ? 'border-brand-orange bg-brand-orange/10'
                                      : 'border-dark-border bg-dark-card hover:border-dark-border-light'
                                  }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-semibold text-foreground">
                            {city.name}
                          </h2>
                          <p className="text-sm text-foreground/50 mt-1">
                            {city.hint}
                          </p>
                        </div>
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200
                                      ${
                                        isSelected
                                          ? 'border-brand-orange bg-brand-orange'
                                          : 'border-foreground/20'
                                      }`}
                        >
                          {isSelected && (
                            <div className="w-2.5 h-2.5 rounded-full bg-white" />
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Continue button */}
            <div className="pb-4 pt-8">
              <button
                onClick={handleCityContinue}
                disabled={!selectedCity}
                className={`w-full rounded-2xl py-4 font-semibold text-lg tap-target
                            active:scale-[0.97] transition-all duration-200
                            flex items-center justify-center gap-2 min-h-[44px]
                            ${
                              selectedCity
                                ? 'gradient-orange text-white'
                                : 'bg-dark-card text-foreground/30 cursor-not-allowed'
                            }`}
              >
                Continue
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------
            STEP 3: Auth Prompt
        ---------------------------------------------------------------- */}
        {step === 'auth' && (
          <div
            className={`flex flex-col flex-1 justify-between transition-opacity duration-150 ${
              transitioning ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="flex-1 flex flex-col items-center justify-center text-center animate-slide-in-right">
              {/* Logo / Brand mark */}
              <div className="w-20 h-20 rounded-2xl gradient-orange flex items-center justify-center mb-8">
                <UtensilsCrossed className="w-10 h-10 text-white" />
              </div>

              <h1 className="font-heading text-3xl font-bold mb-3 text-foreground">
                Welcome to AbiaEats
              </h1>
              <p className="text-foreground/50 text-base leading-relaxed max-w-[300px]">
                Your favorite local food, one tap away.
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 pb-4">
              {/* Sign Up — primary */}
              <button
                onClick={() => completeOnboarding('/auth/signup')}
                className="gradient-orange w-full rounded-2xl py-4 text-white font-semibold text-lg
                           tap-target active:scale-[0.97] transition-transform duration-100
                           flex items-center justify-center min-h-[44px] animate-pulse-glow"
              >
                Sign Up
              </button>

              {/* Log In — secondary */}
              <button
                onClick={() => completeOnboarding('/auth/login')}
                className="w-full rounded-2xl py-4 font-semibold text-lg
                           tap-target active:scale-[0.97] transition-transform duration-100
                           flex items-center justify-center min-h-[44px]
                           border-2 border-brand-orange text-brand-orange
                           hover:bg-brand-orange/10"
              >
                Log In
              </button>

              {/* Skip — tertiary link */}
              <button
                onClick={() => completeOnboarding('/home')}
                className="w-full py-3 text-foreground/40 hover:text-foreground/70
                           transition-colors text-sm font-medium tap-target"
              >
                Browse first
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
