'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

type Certificate = {
  certificate_number: string;
  student_name: string;
  course: string | null;
  location: string | null;
  issued_at: string;
};

export default function CertificateVerifyPage() {
  const params = useParams();
  const number = String(params.number ?? '');
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [loading, setLoading]         = useState(true);
  const [notFound, setNotFound]       = useState(false);

  useEffect(() => {
    if (!number) return;
    fetch(`${BASE}/certificates/${encodeURIComponent(number)}`)
      .then(async r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setCertificate(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [number]);

  return (
    <div className="min-h-screen bg-light py-12">
      <div className="section-container">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="rounded-3xl bg-white p-10 shadow-xl text-center text-gray-500">
              Verifying certificate…
            </div>
          ) : notFound || !certificate ? (
            <div className="rounded-3xl bg-white p-10 shadow-xl text-center">
              <h1 className="text-2xl font-bold text-gray-900">Certificate Not Found</h1>
              <p className="mt-3 text-gray-600">
                We couldn&apos;t find a certificate with number <strong>{number}</strong>. Please check the number and try again.
              </p>
              <Link href="/" className="btn-outline mt-6 inline-block">Return to Home</Link>
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-10 shadow-xl text-center border-4 border-indigo-100">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-green-600">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22,4 12,14.01 9,11.01" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-indigo-600 tracking-wide uppercase">Certificate of Completion — Verified</p>
              <h1 className="mt-3 text-3xl font-bold text-gray-900">{certificate.student_name}</h1>
              <p className="mt-4 text-lg text-gray-600">
                has successfully completed{' '}
                <strong>{certificate.course ?? 'a program'}</strong>
                {certificate.location ? <> at <strong>{certificate.location}</strong></> : null}
              </p>
              <p className="mt-6 text-sm text-gray-400">
                Issued {new Date(certificate.issued_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <p className="mt-2 font-mono text-xs text-gray-400">Certificate #{certificate.certificate_number}</p>
              <Link href="/" className="btn-primary mt-8 inline-block">Return to Home</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
