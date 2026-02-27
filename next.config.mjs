/** @type {import('next').NextConfig} */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://*.supabase.co';
// Derive wss:// origin for Supabase Realtime WebSocket connections
const supabaseWss = supabaseUrl.replace(/^https?:\/\//, 'wss://');

const securityHeaders = [
  // HSTS: force HTTPS for 2 years, all subdomains, eligible for preload list
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  // X-Frame-Options kept for legacy browsers; CSP frame-ancestors below takes precedence
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      // 'unsafe-inline' is required by Next.js for inline hydration scripts.
      // TODO Phase 2: migrate to nonce-based CSP via middleware to remove this.
      "script-src 'self' 'unsafe-inline'",
      // Allow Supabase REST + Auth + Realtime (WebSocket)
      `connect-src 'self' ${supabaseUrl} ${supabaseWss}`,
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' https://fonts.gstatic.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      // Hardening directives
      "base-uri 'self'",        // Prevents <base href="https://evil.com"> hijacking
      "form-action 'self'",     // Restricts form POST targets to same origin
      "frame-ancestors 'none'", // Blocks clickjacking in all browsers (stronger than X-Frame-Options)
    ].join('; '),
  },
];

const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
