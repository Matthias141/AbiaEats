'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, Store, MapPin, Phone, Clock, CreditCard, ChevronDown } from 'lucide-react';

const CUISINE_OPTIONS = [
  'Fast Food', 'Rice Dishes', 'Pepper Soup', 'Grills', 'Shawarma',
  'Drinks', 'Local', 'Bakery', 'Seafood', 'Snacks',
];

export default function RestaurantApplyPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: '',
    description: '',
    phone: '',
    address: '',
    city: 'aba' as 'aba' | 'umuahia',
    cuisine_tags: [] as string[],
    delivery_fee: 500,
    min_delivery_time: 20,
    max_delivery_time: 45,
    bank_name: '',
    bank_account_number: '',
    bank_account_name: '',
  });

  const set = (k: keyof typeof form, v: unknown) => setForm(p => ({ ...p, [k]: v }));

  const toggleCuisine = (tag: string) => {
    set('cuisine_tags', form.cuisine_tags.includes(tag)
      ? form.cuisine_tags.filter(t => t !== tag)
      : [...form.cuisine_tags, tag]);
  };

  const submit = async () => {
    setError('');
    setLoading(true);

    const res = await fetch('/api/restaurant/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, commission_rate: 10 }),
    });

    setLoading(false);

    if (res.ok) {
      setSuccess(true);
    } else {
      const d = await res.json();
      setError(d.error || 'Submission failed. Please try again.');
    }
  };

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <CheckCircle className="w-8 h-8 text-green-500" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
        <p className="text-gray-500 text-sm mb-6">
          We&apos;ll review your application within 24–48 hours and notify you by email.
        </p>
        <button onClick={() => router.push('/restaurant')} className="px-6 py-3 gradient-orange text-white font-medium rounded-xl">
          Back to Portal
        </button>
      </div>
    );
  }

  const inputClass = "w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-brand-orange focus:ring-2 focus:ring-brand-orange/20 transition-all";

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => router.back()} className="w-9 h-9 bg-white border border-gray-200 rounded-xl flex items-center justify-center hover:bg-gray-50">
          <ArrowLeft className="w-4 h-4 text-gray-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">List Your Restaurant</h1>
          <p className="text-sm text-gray-500">Step {step} of 3</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="flex gap-2 mb-8">
        {[1, 2, 3].map(s => (
          <div key={s} className={`h-1.5 flex-1 rounded-full transition-all ${s <= step ? 'gradient-orange' : 'bg-gray-200'}`} />
        ))}
      </div>

      {error && (
        <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-6">
              <Store className="w-5 h-5 text-brand-orange" />
              <h2 className="font-semibold text-gray-900">Restaurant Details</h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Restaurant Name *</label>
              <input type="text" placeholder="e.g. Mama Put Kitchen" value={form.name} onChange={e => set('name', e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Description</label>
              <textarea rows={3} placeholder="Tell customers what makes your restaurant special..." value={form.description} onChange={e => set('description', e.target.value)} className={`${inputClass} resize-none`} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Phone Number *</label>
              <input type="tel" placeholder="08012345678" value={form.phone} onChange={e => set('phone', e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Cuisine Types *</label>
              <div className="flex flex-wrap gap-2">
                {CUISINE_OPTIONS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleCuisine(tag.toLowerCase())}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                      form.cuisine_tags.includes(tag.toLowerCase())
                        ? 'gradient-orange text-white border-transparent'
                        : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location & Delivery */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-6">
              <MapPin className="w-5 h-5 text-brand-orange" />
              <h2 className="font-semibold text-gray-900">Location & Delivery</h2>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">City *</label>
              <div className="relative">
                <select value={form.city} onChange={e => set('city', e.target.value)} className={`${inputClass} appearance-none pr-10`}>
                  <option value="aba">Aba</option>
                  <option value="umuahia">Umuahia</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Restaurant Address *</label>
              <input type="text" placeholder="e.g. 15 Asa Road, Aba" value={form.address} onChange={e => set('address', e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Delivery Fee (₦)</label>
              <input type="number" min="0" step="50" value={form.delivery_fee} onChange={e => set('delivery_fee', parseInt(e.target.value) || 0)} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">
                  <Clock className="inline w-3 h-3 mr-1" />Min Delivery Time (min)
                </label>
                <input type="number" min="5" max="120" value={form.min_delivery_time} onChange={e => set('min_delivery_time', parseInt(e.target.value))} className={inputClass} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Max Delivery Time (min)</label>
                <input type="number" min="10" max="180" value={form.max_delivery_time} onChange={e => set('max_delivery_time', parseInt(e.target.value))} className={inputClass} />
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Banking */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard className="w-5 h-5 text-brand-orange" />
              <h2 className="font-semibold text-gray-900">Bank Details</h2>
            </div>
            <p className="text-xs text-gray-400 mb-6">Required for receiving settlements. All information is stored securely.</p>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Bank Name</label>
              <input type="text" placeholder="e.g. First Bank, GTBank" value={form.bank_name} onChange={e => set('bank_name', e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Account Number</label>
              <input type="text" maxLength={10} placeholder="10-digit NUBAN" value={form.bank_account_number} onChange={e => set('bank_account_number', e.target.value)} className={inputClass} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Account Name</label>
              <input type="text" placeholder="Name on account" value={form.bank_account_name} onChange={e => set('bank_account_name', e.target.value)} className={inputClass} />
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-700">
              Bank details can be provided later. Your application will still be reviewed.
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        {step > 1 && (
          <button onClick={() => setStep(s => s - 1)} className="flex-1 py-3 border border-gray-200 bg-white rounded-xl text-sm text-gray-600 font-medium hover:bg-gray-50 transition-colors">
            Back
          </button>
        )}
        {step < 3 ? (
          <button
            onClick={() => {
              if (step === 1 && (!form.name || !form.phone || form.cuisine_tags.length === 0)) {
                setError('Please fill in restaurant name, phone, and select at least one cuisine type');
                return;
              }
              if (step === 2 && (!form.address)) {
                setError('Please enter your restaurant address');
                return;
              }
              setError('');
              setStep(s => s + 1);
            }}
            className="flex-1 py-3 gradient-orange text-white text-sm font-medium rounded-xl shadow-sm"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-3 gradient-orange text-white text-sm font-medium rounded-xl disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        )}
      </div>
    </div>
  );
}
