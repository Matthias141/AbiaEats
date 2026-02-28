import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — AbiaEats',
  description: 'How AbiaEats collects, uses, and protects your personal data under NDPR 2019.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Link href="/home" className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-8">
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-gray-500 mb-8">Last updated: February 27, 2026</p>
        <div className="space-y-8 text-gray-700 leading-relaxed">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">1. Who We Are</h2>
            <p>AbiaEats is a food delivery platform in Aba and Umuahia, Abia State, Nigeria. Contact: <a href="mailto:privacy@abiaeats.com" className="text-orange-500 hover:underline">privacy@abiaeats.com</a></p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">2. Data We Collect</h2>
            <p>Name, email, phone number, delivery addresses, order history, IP address (security), and bank details for restaurant owners.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">3. How We Use Your Data</h2>
            <p>To process orders, communicate status updates, verify payments, prevent fraud, and settle restaurant payments.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">4. Legal Basis (NDPR 2019)</h2>
            <p>We process data under the Nigeria Data Protection Regulation 2019 on the basis of contract performance, legitimate interests (fraud prevention), and consent.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">5. Data Sharing</h2>
            <p>We share data only with restaurants (to fulfil orders), Supabase (database, EU), and Vercel (hosting). We do not sell personal data.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">6. Your Rights (NDPR)</h2>
            <p>You have the right to access, correct, delete, and export your data. Submit a <Link href="/api/dsar" className="text-orange-500 hover:underline">Data Access Request</Link> or email <a href="mailto:privacy@abiaeats.com" className="text-orange-500 hover:underline">privacy@abiaeats.com</a>. We respond within 30 days.</p>
          </section>
          <section>
            <h2 className="text-xl font-semibold text-gray-900 mb-3">7. Contact</h2>
            <p>Email: <a href="mailto:privacy@abiaeats.com" className="text-orange-500 hover:underline">privacy@abiaeats.com</a> · Aba, Abia State, Nigeria</p>
          </section>
        </div>
      </div>
    </div>
  );
}