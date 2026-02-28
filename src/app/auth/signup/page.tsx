'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Phone, Eye, EyeOff, ArrowLeft, UtensilsCrossed, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { signupSchema } from '@/lib/validations';

export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const parsed = signupSchema.safeParse({
      email,
      password,
      full_name: fullName,
      phone,
    });

    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }

    setIsLoading(true);
    const supabase = createClient();

    const { data, error: authError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          full_name: parsed.data.full_name,
          phone: parsed.data.phone,
          role: 'customer',
        },
      },
    });

    if (authError) {
      // Show helpful messages for non-sensitive errors.
      // Only genericise "user already registered" to prevent account enumeration.
      const msg = authError.message.toLowerCase();
      if (msg.includes('already registered') || msg.includes('already been registered') || msg.includes('duplicate') || msg.includes('already exists')) {
        setError('Something went wrong. Please try again.');
      } else if (msg.includes('rate limit') || msg.includes('too many requests')) {
        setError('Too many attempts. Please wait a moment and try again.');
      } else if (msg.includes('password')) {
        setError('Password must be at least 6 characters.');
      } else if (msg.includes('email')) {
        setError('Please enter a valid email address.');
      } else {
        setError('Unable to create account. Please check your connection and try again.');
      }
      setIsLoading(false);
      return;
    }

    // Some Supabase configurations return success with identities: []
    // when the email is already registered (to prevent enumeration).
    if (data?.user?.identities?.length === 0) {
      setError('Something went wrong. Please try again.');
      setIsLoading(false);
      return;
    }

    setSuccess(true);
    setIsLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-50 border border-green-100 mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Check your email</h1>
          <p className="text-sm text-gray-500 mb-2 leading-relaxed">
            We sent a confirmation link to
          </p>
          <p className="text-sm text-brand-orange font-medium mb-8">{email}</p>
          <p className="text-xs text-gray-400 mb-8">
            Click the link in your email to activate your account, then come back to sign in.
          </p>
          <Link
            href="/auth/login"
            className="block w-full min-h-[52px] flex items-center justify-center rounded-xl bg-gray-50 border border-gray-200 text-gray-700 font-medium hover:bg-gray-100 transition-colors active:scale-[0.97]"
          >
            Back to Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-x-hidden">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="tap-target w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-gray-700" />
        </button>
        <Link
          href="/home"
          className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 pb-8">
        <div className="w-full max-w-sm">
          {/* Logo & Heading */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-orange mb-5 shadow-lg shadow-brand-orange/20">
              <UtensilsCrossed className="w-7 h-7 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create account</h1>
            <p className="text-sm text-gray-500">
              Join AbiaEats and start ordering
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600 text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSignup} className="space-y-3.5">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  className="w-full min-h-[52px] pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full min-h-[52px] pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">
                Phone Number
              </label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="tel"
                  placeholder="08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoComplete="tel"
                  className="w-full min-h-[52px] pl-11 pr-4 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 focus:bg-white transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5 ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full min-h-[52px] pl-11 pr-12 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full min-h-[52px] flex items-center justify-center gap-2 rounded-xl gradient-orange text-white font-medium shadow-lg shadow-brand-orange/20 hover:shadow-brand-orange/30 transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none mt-5"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          {/* Terms */}
          <p className="text-center text-[11px] text-gray-400 mt-5 leading-relaxed">
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </p>

          {/* Login link */}
          <p className="text-center text-sm text-gray-400 mt-6">
            Already have an account?{' '}
            <Link
              href="/auth/login"
              className="text-brand-orange hover:text-brand-orange-light transition-colors font-medium"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
