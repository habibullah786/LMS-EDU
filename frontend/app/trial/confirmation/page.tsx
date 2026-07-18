'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '@/lib/apiClient';

type Details = { status: string; expired: boolean; parent_name: string; student_name: string; class_name?: string; class_date?: string; class_time?: string; location?: string };

function ConfirmationContent() {
  const params = useSearchParams();
  const token = params.get('token') ?? '';
  const suggested = params.get('action') === 'cancel' ? 'cancel' : 'confirm';
  const channel = params.get('channel') === 'sms_link' ? 'sms_link' : 'email_link';
  const [details, setDetails] = useState<Details | null>(null);
  const [choice, setChoice] = useState<'confirm' | 'cancel'>(suggested);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setMessage('This confirmation link is invalid.'); setLoading(false); return; }
    fetch(`${API_BASE_URL}/trial/confirmation/${encodeURIComponent(token)}`)
      .then(async response => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.message || 'Unable to open this confirmation.');
        setDetails(body);
      })
      .catch(error => setMessage(error.message))
      .finally(() => setLoading(false));
  }, [token]);

  async function submit() {
    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/trial/confirmation/${encodeURIComponent(token)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: choice, channel }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.message || 'Unable to save your response.');
      setDetails(current => current ? { ...current, status: body.status } : current);
      setMessage(body.status === 'confirmed' ? 'Your trial class is confirmed. We look forward to seeing you!' : 'Your trial class has been cancelled.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Unable to save your response.');
    } finally { setSubmitting(false); }
  }

  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <section className="w-full max-w-lg rounded-2xl bg-white p-7 shadow-lg">
      <h1 className="text-2xl font-bold text-slate-900">Trial class response</h1>
      {loading ? <p className="mt-5 text-slate-500">Loading your booking…</p> : message ? <div className="mt-5 rounded-xl bg-blue-50 p-4 text-blue-900">{message}</div> : details && <>
        <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700 space-y-1">
          <p><strong>Student:</strong> {details.student_name}</p><p><strong>Class:</strong> {details.class_name}</p>
          <p><strong>Date and time:</strong> {details.class_date} {details.class_time}</p><p><strong>Location:</strong> {details.location}</p>
        </div>
        {details.expired ? <p className="mt-5 text-red-700">This link has expired. Please contact us.</p> : details.status !== 'pending' ? <p className="mt-5 font-medium">This booking is already {details.status}.</p> : <>
          <p className="mt-6 font-medium text-slate-800">Can your child attend?</p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button onClick={() => setChoice('confirm')} className={`rounded-xl border p-3 font-semibold ${choice === 'confirm' ? 'border-green-600 bg-green-50 text-green-800' : 'border-slate-200'}`}>Yes, confirm</button>
            <button onClick={() => setChoice('cancel')} className={`rounded-xl border p-3 font-semibold ${choice === 'cancel' ? 'border-red-600 bg-red-50 text-red-800' : 'border-slate-200'}`}>No, cancel</button>
          </div>
          <button disabled={submitting} onClick={submit} className="mt-4 w-full rounded-xl bg-indigo-700 p-3 font-semibold text-white disabled:opacity-50">{submitting ? 'Saving…' : 'Submit response'}</button>
        </>}
      </>}
    </section>
  </main>;
}

export default function TrialConfirmationPage() {
  return <Suspense fallback={<main className="p-8">Loading…</main>}><ConfirmationContent /></Suspense>;
}
