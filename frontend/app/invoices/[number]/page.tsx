'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

type Invoice = {
  invoice_number: string;
  amount: string;
  method: 'invoice' | 'purchase_order';
  purchase_order_number: string | null;
  status: 'unpaid' | 'paid' | 'void';
  due_date: string | null;
  parent_name: string;
  parent_email: string;
  paid_at: string | null;
  created_at: string;
};

export default function InvoiceViewPage() {
  const params = useParams();
  const number = String(params.number ?? '');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!number) return;
    fetch(`${BASE}/invoices/${encodeURIComponent(number)}`)
      .then(async r => {
        if (!r.ok) { setNotFound(true); return null; }
        return r.json();
      })
      .then(data => { if (data) setInvoice(data); })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [number]);

  return (
    <div className="min-h-screen bg-light py-12">
      <div className="section-container">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="rounded-3xl bg-white p-10 shadow-xl text-center text-gray-500">Loading invoice…</div>
          ) : notFound || !invoice ? (
            <div className="rounded-3xl bg-white p-10 shadow-xl text-center">
              <h1 className="text-2xl font-bold text-gray-900">Invoice Not Found</h1>
              <p className="mt-3 text-gray-600">We couldn&apos;t find an invoice with number <strong>{number}</strong>.</p>
              <Link href="/" className="btn-outline mt-6 inline-block">Return to Home</Link>
            </div>
          ) : (
            <div className="rounded-3xl bg-white p-10 shadow-xl">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wide">
                    {invoice.method === 'purchase_order' ? 'Purchase Order Invoice' : 'Invoice'}
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-gray-900">#{invoice.invoice_number}</h1>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                  invoice.status === 'unpaid' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                }`}>{invoice.status.toUpperCase()}</span>
              </div>

              <div className="grid grid-cols-2 gap-6 mb-8">
                <div>
                  <p className="text-sm text-gray-500">Billed To</p>
                  <p className="font-semibold text-gray-900">{invoice.parent_name}</p>
                  <p className="text-sm text-gray-600">{invoice.parent_email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Amount Due</p>
                  <p className="text-2xl font-bold text-gray-900">${Number(invoice.amount).toFixed(2)}</p>
                </div>
                {invoice.due_date && (
                  <div>
                    <p className="text-sm text-gray-500">Due Date</p>
                    <p className="font-semibold text-gray-900">{new Date(invoice.due_date).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                )}
                {invoice.purchase_order_number && (
                  <div>
                    <p className="text-sm text-gray-500">PO Number</p>
                    <p className="font-semibold text-gray-900">{invoice.purchase_order_number}</p>
                  </div>
                )}
                {invoice.paid_at && (
                  <div>
                    <p className="text-sm text-gray-500">Paid On</p>
                    <p className="font-semibold text-green-600">{new Date(invoice.paid_at).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                  </div>
                )}
              </div>

              <div className="text-center">
                <Link href="/" className="btn-primary inline-block">Return to Home</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
