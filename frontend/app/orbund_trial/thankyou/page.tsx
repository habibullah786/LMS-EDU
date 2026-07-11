'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { orbundProxy } from '@/lib/orbundProxy';

interface ThankYouData {
  studentName?: string;
  courseName?: string;
  className?: string;
  startDate?: string;
  schedule?: string;
  location?: string;
  confirmationNumber?: string;
  [key: string]: unknown;
}

export default function OrbundThankYouPage() {
  const router = useRouter();
  const [data,    setData]    = useState<ThankYouData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sessionId = localStorage.getItem('orbund_session_id') || '';
    orbundProxy
      .getThankYou(sessionId)
      .then((res: ThankYouData) => setData(res))
      .catch(() => setData({}))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8 text-center">

        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '100%' }} />
        </div>

        {loading ? (
          <div className="py-8">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading confirmation…</p>
          </div>
        ) : (
          <>
            <div className="text-5xl mb-4">🎉</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">You're enrolled!</h1>
            <p className="text-gray-500 mb-8">
              Thank you for enrolling with Exceed Robotics. We look forward to seeing you in class!
            </p>

            {data && Object.keys(data).length > 0 && (
              <div className="bg-indigo-50 rounded-xl p-5 text-left space-y-3 mb-8">
                {data.confirmationNumber && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Confirmation #</span>
                    <span className="font-semibold text-gray-900">{data.confirmationNumber}</span>
                  </div>
                )}
                {data.studentName && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Student</span>
                    <span className="font-medium text-gray-900">{data.studentName}</span>
                  </div>
                )}
                {(data.courseName || data.className) && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Class</span>
                    <span className="font-medium text-gray-900">{data.courseName || data.className}</span>
                  </div>
                )}
                {data.startDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Start Date</span>
                    <span className="font-medium text-gray-900">{data.startDate}</span>
                  </div>
                )}
                {data.schedule && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Schedule</span>
                    <span className="font-medium text-gray-900">{data.schedule}</span>
                  </div>
                )}
                {data.location && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Location</span>
                    <span className="font-medium text-gray-900">{data.location}</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => window.print()}
                className="w-full border border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold py-3 rounded-xl"
              >
                Print Confirmation
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl"
              >
                Back to Home
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
