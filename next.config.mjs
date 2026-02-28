/** @type {import('next').NextConfig} */

/**
 * SECURITY NOTE — CSP is now nonce-based, generated per-request in middleware.
 * See: src/lib/supabase/middleware.ts → updateSession()
 *
 * CSP intentionally NOT set here — middleware sets it with per-request nonce.
 * Static unsafe-inline CSP here would override/conflict with the nonce header.
 * Non-CSP security headers are safe to set here.
 */

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self)' },
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
