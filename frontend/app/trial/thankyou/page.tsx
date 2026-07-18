'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { orbund } from '@/lib/orbund';

interface ThankYouClass {
  name: string;
  course?: string;
  session?: string;
  dates: string;
  time: string;
  tuition?: string;
}

export default function ThankYouPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<ThankYouClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [parentEmail, setParentEmail] = useState('');

  useEffect(() => {
    const sessionId = localStorage.getItem('orbund_session_id') || '';
    const reg = localStorage.getItem('trial_registration');
    if (reg) {
      const { email } = JSON.parse(reg);
      setParentEmail(email);
    }

    (async () => {
      try {
        const cached = sessionStorage.getItem('thankYouData');
        if (cached) {
          const info = JSON.parse(cached)?.thankYouPageInfo;
          setClasses(info?.thankYouPageClasses || []);
          return;
        }
        const data = await orbund.getThankYou(sessionId);
        if (data?.thankYouPageInfo) {
          sessionStorage.setItem('thankYouData', JSON.stringify(data));
        }
        const info = data?.thankYouPageInfo;
        const orbundClasses: ThankYouClass[] = info?.thankYouPageClasses || [];

        if (orbundClasses.length > 0) {
          setClasses(orbundClasses);
        } else {
          // Fallback: build summary from cart sessionStorage (free trial flow)
          const rawCart = sessionStorage.getItem('cartStudents');
          if (rawCart) {
            const students = JSON.parse(rawCart);
            setClasses(students.map((s: { firstName: string; lastName: string; _session?: string; classIds: string[]; _date?: string | null; _time?: string | null }) => ({
              name: `${s.firstName} ${s.lastName}`,
              course: s._session || s.classIds[0],
              dates: s._date ? new Date(s._date + 'T00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '',
              time: s._time || '',
            })));
          }
        }
      } catch {
        // Fallback: build from cart on any Orbund error
        try {
          const rawCart = sessionStorage.getItem('cartStudents');
          if (rawCart) {
            const students = JSON.parse(rawCart);
            setClasses(students.map((s: { firstName: string; lastName: string; _session?: string; classIds: string[]; _date?: string | null; _time?: string | null }) => ({
              name: `${s.firstName} ${s.lastName}`,
              course: s._session || s.classIds[0],
              dates: s._date ? new Date(s._date + 'T00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '',
              time: s._time || '',
            })));
          }
        } catch {
          // show generic confirmation
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function clearAndGoHome() {
    const keysToRemove = [
      'orbund_session_id', 'orbund_enrollment_id', 'trial_registration',
      'lms_enrollment_id', 'lms_token', 'lms_user_id',
    ];
    keysToRemove.forEach(k => localStorage.removeItem(k));
    sessionStorage.clear();
    router.push('/');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900">Your trial is booked!</h1>
          <p className="text-gray-500 mt-2">Registration complete — status pending</p>
          {parentEmail && (
            <p className="text-gray-600 mt-3">
              Booking details have been sent to <strong>{parentEmail}</strong>
            </p>
          )}
        </div>

        {/* Progress bar — full */}
        <div className="w-full bg-indigo-600 rounded-full h-2 mb-8" />

        {loading ? (
          <div className="text-center py-4 text-gray-500">Loading your class details...</div>
        ) : classes.length > 0 ? (
          <div className="mb-8">
            <h2 className="font-semibold text-gray-800 mb-4">Your Trial Class Details</h2>
            <div className="border rounded-xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-indigo-50">
                    <th className="text-left px-4 py-2 text-indigo-700 font-semibold">Student</th>
                    <th className="text-left px-4 py-2 text-indigo-700 font-semibold">Course</th>
                    <th className="text-left px-4 py-2 text-indigo-700 font-semibold">Date / Time</th>
                  </tr>
                </thead>
                <tbody>
                  {classes.map((cls, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-4 py-3 text-gray-800">{cls.name}</td>
                      <td className="px-4 py-3 text-gray-600">{cls.course || cls.session}</td>
                      <td className="px-4 py-3 text-gray-600">
                        <div>{cls.dates}</div>
                        <div>{cls.time}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-8 text-center text-green-700">
            Your trial class has been booked successfully. We&apos;ll be in touch with details!
          </div>
        )}

        {/* Next steps */}
        <div className="bg-indigo-50 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-indigo-900 mb-2">What happens next?</h3>
          <ul className="text-sm text-indigo-800 space-y-1">
            <li>✔ Check your email for a confirmation</li>
            <li>✔ About 24 hours before class, confirm by email link, SMS link, or SMS reply</li>
            <li>✔ Bring your child 5 minutes early on class day</li>
          </ul>
        </div>

        <div className="flex flex-col gap-3 print:hidden">
          <button
            onClick={clearAndGoHome}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl"
          >
            Back to Home
          </button>
          <button
            onClick={() => window.print()}
            className="w-full border border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-50 text-sm"
          >
            Print Confirmation
          </button>
        </div>
      </div>
    </div>
  );
}
