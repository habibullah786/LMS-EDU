'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { orbund } from '@/lib/orbund';
import { lmsApi } from '@/lib/lmsApi';

interface PaymentPlan {
  paymentPlanId: number;
  planName: string;
  dueNow: string;
  dueLater?: string;
  installments?: number;
}

interface ClassPaymentInfo {
  classId: number;
  courseName: string;
  studentName: string;
  paymentPlans: PaymentPlan[];
  selectedPlanId?: number;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [classPayments, setClassPayments] = useState<ClassPaymentInfo[]>([]);
  const [isFree, setIsFree] = useState(false);
  const [enrollmentSaved, setEnrollmentSaved] = useState(false);

  useEffect(() => {
    const sessionId = localStorage.getItem('orbund_session_id') || '';
    const raw = sessionStorage.getItem('cartStudents');

    (async () => {
      try {
        // If all cart items are admin-defined free trial classes, skip Orbund entirely
        const cartStudents = raw ? JSON.parse(raw) : [];
        const allFreeTrial = cartStudents.length > 0 &&
          cartStudents.every((s: { _type?: string }) => s._type === 'Trial');

        if (allFreeTrial) {
          setIsFree(true);
          await saveEnrollmentToLms(true, {});
          setLoading(false);
          return;
        }

        // For paid classes, use Orbund to get payment plans
        const groupEnrollResp = await orbund.saveGroupEnrollment(sessionId);
        const orbundEnrollmentId = groupEnrollResp?.enrollmentId ?? groupEnrollResp?.orbund_enrollment_id ?? null;
        if (orbundEnrollmentId) {
          localStorage.setItem('orbund_enrollment_id', String(orbundEnrollmentId));
        }

        const paymentData = await orbund.collectPayment(sessionId);
        const free = paymentData.isFreeClass === true || paymentData.totalAmount === 0 || paymentData.totalAmount === '0.00' || !paymentData.classes?.length;
        setIsFree(free);

        if (!free) {
          setClassPayments((paymentData.classPaymentInfoList || []).map((c: Record<string, unknown>) => ({
            ...c,
            selectedPlanId: (c.paymentPlans as PaymentPlan[])?.[0]?.paymentPlanId,
          })));
        }

        await saveEnrollmentToLms(free, paymentData);
      } catch {
        setError('Failed to load checkout. Please go back and try again.');
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveEnrollmentToLms(free: boolean, paymentData: Record<string, unknown>) {
    if (enrollmentSaved) return;
    const reg = localStorage.getItem('trial_registration');
    const raw = sessionStorage.getItem('cartStudents');
    if (!reg || !raw) return;

    const { name, email, phone, locationLabel } = JSON.parse(reg);
    const cartStudents = JSON.parse(raw);

    try {
      const { pageUrl, course } = JSON.parse(reg);
      const res = await lmsApi.saveTrialEnrollment({
        parent_name: name,
        parent_email: email,
        parent_phone: phone,
        total_amount: free ? 0 : Number(paymentData.totalAmount || 0),
        source: pageUrl || 'trial',
        trial_ref_id: localStorage.getItem('orbund_enrollment_id') || null,
        location: locationLabel,
        course: course || '',
        students: cartStudents.map((s: { uniqueId: number; firstName: string; lastName: string; dateOfBirth: string; classIds: string[]; _session?: string }) => ({
          orbund_unique_id: String(s.uniqueId),
          first_name: s.firstName,
          last_name: s.lastName,
          date_of_birth: s.dateOfBirth,
          orbund_class_id: s.classIds[0],
          course: course || s._session || '',
        })),
      });
      if (res.enrollment_id) {
        localStorage.setItem('lms_enrollment_id', String(res.enrollment_id));
      }
      setEnrollmentSaved(true);
    } catch {
      // non-fatal
    }
  }

  async function selectPlan(classId: number, planId: number) {
    const sessionId = localStorage.getItem('orbund_session_id') || '';
    const updated = classPayments.map(c =>
      c.classId === classId ? { ...c, selectedPlanId: planId } : c
    );
    setClassPayments(updated);
    try {
      await orbund.selectPaymentPlan(sessionId, { classId, paymentPlanId: planId, studentId: 0 });
    } catch {
      // ignore
    }
  }

  async function proceed() {
    if (isFree) {
      router.push('/trial/thankyou');
    } else {
      setSaving(true);
      // Save dueObj to sessionStorage for thank-you page
      const dueNow = classPayments.reduce((sum, c) => {
        const plan = c.paymentPlans.find(p => p.paymentPlanId === c.selectedPlanId);
        return sum + (parseFloat(plan?.dueNow?.replace(/[^0-9.]/g, '') || '0') || 0);
      }, 0);
      sessionStorage.setItem('dueObj', JSON.stringify({ dueNow: `$${dueNow.toFixed(2)}`, dueLater: 0 }));
      setSaving(false);
      router.push('/trial/billing');
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Payment Options</h1>
          <p className="text-gray-500 mt-1">Step 5 of 7 — Choose your payment plan</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '71%' }} />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading payment options...</div>
        ) : isFree ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-xl font-bold text-green-600 mb-2">Free Trial Class!</h2>
            <p className="text-gray-500 mb-6">No payment required for your trial class.</p>
            <button
              onClick={proceed}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl"
            >
              Confirm Registration →
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-6 mb-8">
              {classPayments.map(c => (
                <div key={c.classId}>
                  <h3 className="font-semibold text-gray-900 mb-2">{c.courseName} — {c.studentName}</h3>
                  <div className="grid gap-2">
                    {c.paymentPlans.map(plan => (
                      <label
                        key={plan.paymentPlanId}
                        className={`flex items-start gap-3 border-2 rounded-xl p-3 cursor-pointer transition-colors ${
                          c.selectedPlanId === plan.paymentPlanId
                            ? 'border-indigo-600 bg-indigo-50'
                            : 'border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`plan-${c.classId}`}
                          checked={c.selectedPlanId === plan.paymentPlanId}
                          onChange={() => selectPlan(c.classId, plan.paymentPlanId)}
                          className="mt-0.5"
                        />
                        <div>
                          <div className="font-medium text-gray-900">{plan.planName}</div>
                          <div className="text-sm text-gray-500">Due now: {plan.dueNow}</div>
                          {plan.dueLater && parseFloat(plan.dueLater) > 0 && (
                            <div className="text-sm text-gray-500">Due later: {plan.dueLater}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => router.push('/trial/login')}
                className="flex-1 border border-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                onClick={proceed}
                disabled={saving}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg"
              >
                {saving ? 'Please wait...' : 'Continue to Billing →'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
