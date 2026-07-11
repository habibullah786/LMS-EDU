'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { orbundProxy } from '@/lib/orbundProxy';

interface BillingField {
  name: string;
  label: string;
  type: string;
  required: boolean;
  options?: { value: string; label: string }[];
}

const STATIC_FIELDS: BillingField[] = [
  { name: 'cardHolderName', label: 'Cardholder Name',   type: 'text',     required: true },
  { name: 'cardNumber',     label: 'Card Number',        type: 'text',     required: true },
  { name: 'expiryMonth',   label: 'Expiry Month (MM)',  type: 'text',     required: true },
  { name: 'expiryYear',    label: 'Expiry Year (YY)',   type: 'text',     required: true },
  { name: 'cvv',           label: 'CVV',                type: 'password', required: true },
  { name: 'address',       label: 'Billing Address',    type: 'text',     required: true },
  { name: 'city',          label: 'City',               type: 'text',     required: true },
  { name: 'postalCode',    label: 'Postal / Zip Code',  type: 'text',     required: true },
];

export default function OrbundPaymentPage() {
  const router = useRouter();
  const [fields,      setFields]      = useState<BillingField[]>(STATIC_FIELDS);
  const [form,        setForm]        = useState<Record<string, string>>({});
  const [states,      setStates]      = useState<{ value: string; label: string }[]>([]);
  const [country,     setCountry]     = useState('CA');
  const [loading,     setLoading]     = useState(true);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState('');

  function sid() {
    return typeof window !== 'undefined' ? localStorage.getItem('orbund_session_id') || '' : '';
  }

  useEffect(() => {
    (async () => {
      try {
        const [billingData, stateData] = await Promise.allSettled([
          orbundProxy.getBillingInfo(sid()),
          orbundProxy.getStates(sid(), 'CA'),
        ]);
        if (billingData.status === 'fulfilled' && billingData.value?.fields) {
          setFields(billingData.value.fields);
        }
        if (stateData.status === 'fulfilled') {
          setStates(stateData.value?.options || []);
        }
      } catch {
        // keep static fields
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function handleCountryChange(val: string) {
    setCountry(val);
    setForm(f => ({ ...f, country: val, state: '' }));
    try {
      const data = await orbundProxy.getStates(sid(), val);
      setStates(data?.options || []);
    } catch {
      setStates([]);
    }
  }

  function validate(): string {
    for (const f of fields) {
      if (f.required && !form[f.name]?.trim()) return `Please fill in ${f.label}.`;
    }
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSubmitting(true);

    try {
      const res = await orbundProxy.processPayment(sid(), { ...form, country });
      if (res?.error) {
        setError(res.error?.message || 'Payment failed. Please check your card details.');
        setSubmitting(false);
        return;
      }
      router.push('/orbund_trial/thankyou');
    } catch {
      setError('Payment processing failed. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Billing Information</h1>
          <p className="text-gray-500 mt-1">Step 5 of 6 — Enter your payment details</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '83%' }} />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading billing form…</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
              <select
                value={country}
                onChange={e => handleCountryChange(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="CA">Canada</option>
                <option value="US">United States</option>
              </select>
            </div>

            {states.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Province / State</label>
                <select
                  value={form.state || ''}
                  onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">— Select —</option>
                  {states.map(s => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>
            )}

            {fields.map(f => (
              <div key={f.name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {f.label} {f.required && '*'}
                </label>
                {f.options ? (
                  <select
                    value={form[f.name] || ''}
                    onChange={e => setForm(frm => ({ ...frm, [f.name]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">— Select —</option>
                    {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : (
                  <input
                    type={f.type || 'text'}
                    value={form[f.name] || ''}
                    onChange={e => setForm(frm => ({ ...frm, [f.name]: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    autoComplete={f.name === 'cardNumber' ? 'cc-number' : f.name === 'cvv' ? 'cc-csc' : undefined}
                  />
                )}
              </div>
            ))}

            <div className="flex items-center gap-2 text-xs text-gray-400 mt-2">
              <span>🔒</span>
              <span>Your payment is secured with SSL encryption.</span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button" onClick={() => router.push('/orbund_trial/login')}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                type="submit" disabled={submitting}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg"
              >
                {submitting ? 'Processing…' : 'Pay Now →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
