'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { orbund } from '@/lib/orbund';

interface CartStudent {
  uniqueId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  classIds: string[];
  _session?: string;
}

interface CartLine {
  classId: string;
  session: string;
  dates: string;
  time: string;
  tuition: number;
  occurrence?: number;
}

interface CartSummary {
  subTotal?: string;
  total?: string;
  discount?: string;
  tuitionTax?: string;
  couponCode?: string;
}

export default function CartPage() {
  const router = useRouter();
  const [cartStudents, setCartStudents] = useState<CartStudent[]>([]);
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [summary, setSummary] = useState<CartSummary>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const raw = sessionStorage.getItem('cartStudents');
    if (!raw) { router.replace('/trial/classes'); return; }
    const students: CartStudent[] = JSON.parse(raw);
    setCartStudents(students);
    fetchCart(students);
  }, [router]);

  async function fetchCart(students: CartStudent[]) {
    const sessionId = localStorage.getItem('orbund_session_id') || '';
    setLoading(true);
    try {
      const data = await orbund.displayCart(sessionId, {
        displayCartStudents: students,
        couponCode: '',
      });
      // Merge classes + enrolledClasses (matches WordPress reference)
      const classArr: CartLine[] = data.classes || [];
      const enrolledArr: CartLine[] = data.enrolledClasses || [];
      const merged = dedupeByClassId([...classArr, ...enrolledArr]);
      setCartLines(merged);
      setSummary(data.cartSummary || {});
    } catch {
      // Fall back to local display
      setError('Failed to load your cart. Please try again.');
      const lines = students.map(s => ({
        classId: s.classIds[0],
        session: s._session || s.classIds[0],
        dates: '',
        time: '',
        tuition: 0,
      }));
      setCartLines(lines);
    } finally {
      setLoading(false);
    }
  }

  function dedupeByClassId(arr: CartLine[]): CartLine[] {
    const map = new Map<string, CartLine>();
    for (const item of arr) {
      if (map.has(item.classId)) {
        const existing = map.get(item.classId)!;
        existing.occurrence = (existing.occurrence || 1) + 1;
        existing.tuition += item.tuition;
      } else {
        map.set(item.classId, { ...item, occurrence: 1 });
      }
    }
    return Array.from(map.values());
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Review Your Cart</h1>
          <p className="text-gray-500 mt-1">Step 3 of 7 — Confirm your selections</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '42%' }} />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading cart...</div>
        ) : (
          <>
            {/* Class lines */}
            <div className="divide-y divide-gray-100 mb-6">
              {cartLines.length > 0 ? cartLines.map((line, i) => (
                <div key={i} className="py-3">
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-900">{line.session}</span>
                    <span className="text-indigo-600 font-semibold">
                      {line.tuition === 0 ? 'Free' : `$${line.tuition}`}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {line.occurrence && line.occurrence > 1 && (
                      <span>{line.occurrence} student{line.occurrence > 1 ? 's' : ''} · </span>
                    )}
                    {line.dates && <span>{line.dates}</span>}
                    {line.time && <span> · {line.time}</span>}
                  </div>
                </div>
              )) : cartStudents.map((s, i) => (
                <div key={i} className="py-3 flex justify-between">
                  <div>
                    <span className="font-medium">{s._session || s.classIds[0]}</span>
                    <div className="text-sm text-gray-500">{s.firstName} {s.lastName}</div>
                  </div>
                  <span className="text-indigo-600 font-semibold">Free</span>
                </div>
              ))}
            </div>

            {/* Summary */}
            {(summary.subTotal || summary.total) && (
              <div className="bg-gray-50 rounded-xl p-4 mb-6 space-y-1">
                {summary.subTotal && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>Subtotal</span><span>{summary.subTotal}</span>
                  </div>
                )}
                {summary.tuitionTax && (
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>HST</span><span>{summary.tuitionTax}</span>
                  </div>
                )}
                {summary.discount && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span><span>-{summary.discount}</span>
                  </div>
                )}
                {summary.total && (
                  <div className="flex justify-between font-bold text-gray-900 pt-1 border-t">
                    <span>Total</span><span>{summary.total}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/trial/classes')}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={() => router.push('/trial/login')}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-lg"
              >
                Continue →
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
