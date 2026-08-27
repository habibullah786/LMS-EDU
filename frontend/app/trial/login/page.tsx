'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { orbund } from '@/lib/orbund';
import { lmsApi } from '@/lib/lmsApi';

// Module-level flag survives React Strict Mode unmount/remount cycles,
// preventing the double useEffect from creating two enrollment records.
let _enrollmentSaveInProgress = false;

type Mode = 'choice' | 'login' | 'register';

interface CartStudent {
  _type?: string;
  uniqueId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  classIds: string[];
  _session?: string;
  _date?: string | null;
  _time?: string | null;
}

interface TrialParent {
  name: string;
  email: string;
  phone: string;
}

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('choice');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [trialParent, setTrialParent] = useState<TrialParent | null>(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm, setRegForm] = useState({
    firstName: '', lastName: '', email: '', password: '', confirm: '', phone: '',
  });

  // Skip auth step if already logged in (either token)
  useEffect(() => {
    const savedRegistration = localStorage.getItem('trial_registration');
    if (savedRegistration) {
      try {
        const saved = JSON.parse(savedRegistration) as Partial<TrialParent>;
        const name = String(saved.name ?? '').trim();
        const email = String(saved.email ?? '').trim();
        const phone = String(saved.phone ?? '').trim();
        const nameParts = name.split(/\s+/).filter(Boolean);
        const firstName = nameParts.shift() ?? '';
        const lastName = nameParts.join(' ') || firstName;

        if (name && email) {
          setTrialParent({ name, email, phone });
          setLoginForm(form => ({ ...form, email }));
          setRegForm(form => ({ ...form, firstName, lastName, email, phone }));
        }
      } catch {
        // Keep the manual fallback form available if saved data is invalid.
      }
    }

    const token = localStorage.getItem('auth_token');
    if (token) {
      saveEnrollmentAndContinue().catch(() => setLoading(false));
    } else {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function isAllFreeTrial(): boolean {
    try {
      const raw = sessionStorage.getItem('cartStudents');
      if (!raw) return false;
      const students: CartStudent[] = JSON.parse(raw);
      return students.length > 0 && students.every(s => s._type === 'Trial');
    } catch {
      return false;
    }
  }

  async function saveEnrollmentAndContinue() {
    if (isAllFreeTrial()) {
      await saveEnrollmentToLms();
      router.push('/trial/thankyou');
    } else {
      router.push('/trial/checkout');
    }
  }

  async function saveEnrollmentToLms() {
    // Synchronous guard: blocks Strict Mode's second useEffect from racing through
    // before the first async API call has written lms_enrollment_id to localStorage.
    if (_enrollmentSaveInProgress || localStorage.getItem('lms_enrollment_id')) return;
    _enrollmentSaveInProgress = true;

    const reg = localStorage.getItem('trial_registration');
    const raw = sessionStorage.getItem('cartStudents');
    if (!reg || !raw) { _enrollmentSaveInProgress = false; return; }

    try {
      const { name, email, phone, locationLabel, pageUrl, course } = JSON.parse(reg);
      const cartStudents: CartStudent[] = JSON.parse(raw);
      const res = await lmsApi.saveTrialEnrollment({
        lead_id: Number(localStorage.getItem('lms_lead_id')) || undefined,
        parent_name: name,
        parent_email: email,
        parent_phone: phone,
        total_amount: 0,
        source: pageUrl || 'trial',
        trial_ref_id: null,
        location: locationLabel,
        course: course || '',
        students: cartStudents.map(s => ({
          orbund_unique_id: String(s.uniqueId),
          first_name: s.firstName,
          last_name: s.lastName,
          date_of_birth: s.dateOfBirth,
          orbund_class_id: s._session || s.classIds[0],
          class_date: s._date || null,
          class_time: s._time || null,
          course: course || '',
        })),
      });
      if (res.enrollment_id) {
        localStorage.setItem('lms_enrollment_id', String(res.enrollment_id));
      }
    } catch {
      _enrollmentSaveInProgress = false; // allow retry on failure
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');

    const sessionId = localStorage.getItem('orbund_session_id') || '';
    try {
      const [orbundRes, lmsRes] = await Promise.allSettled([
        orbund.login(sessionId, loginForm.email, loginForm.password),
        lmsApi.login(loginForm.email, loginForm.password),
      ]);

      // LMS is the authority
      const lmsOk = lmsRes.status === 'fulfilled' && lmsRes.value?.token;
      if (!lmsOk) { setError('Invalid email or password. Please try again.'); setLoading(false); return; }

      localStorage.setItem('auth_token', lmsRes.value.token);
      if (lmsRes.value.user?.id) localStorage.setItem('lms_user_id', String(lmsRes.value.user.id));

      if (orbundRes.status === 'fulfilled' && !orbundRes.value?.error) {
        const newSessionId = orbundRes.value?.sessionId;
        if (newSessionId) localStorage.setItem('orbund_session_id', newSessionId);
      }

      await saveEnrollmentAndContinue();
    } catch {
      setError('Login failed. Please try again.');
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!regForm.firstName || !regForm.lastName || !regForm.email || !regForm.password) {
      setError('Please fill in all required fields.'); return;
    }
    if (regForm.password !== regForm.confirm) { setError('Passwords do not match.'); return; }
    if (regForm.password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    setLoading(true); setError('');

    const sessionId = localStorage.getItem('orbund_session_id') || '';
    const fullName = trialParent?.name || `${regForm.firstName} ${regForm.lastName}`.trim();
    try {
      const [orbundRes, lmsRes] = await Promise.allSettled([
        orbund.register(sessionId, {
          username: regForm.email,
          password: regForm.password,
          firstName: regForm.firstName,
          lastName: regForm.lastName,
          email: regForm.email,
          cellPhone: regForm.phone,
        }),
        lmsApi.register(fullName, regForm.email, regForm.password, regForm.phone),
      ]);

      // LMS is the authority
      if (lmsRes.status === 'rejected' || !lmsRes.value?.token) {
        setError('Registration failed. This email may already be in use.');
        setLoading(false);
        return;
      }

      localStorage.setItem('auth_token', lmsRes.value.token);
      if (lmsRes.value.user?.id) localStorage.setItem('lms_user_id', String(lmsRes.value.user.id));

      if (orbundRes.status === 'fulfilled' && !orbundRes.value?.error) {
        const newSessionId = orbundRes.value?.sessionId;
        if (newSessionId) localStorage.setItem('orbund_session_id', newSessionId);
      }

      await saveEnrollmentAndContinue();
    } catch {
      setError('Registration failed. Please try again.');
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Please wait…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Account</h1>
          <p className="text-gray-500 mt-1">Step 4 of 7 — Sign in or create an account</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '57%' }} />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {/* Mode choice */}
        {mode === 'choice' && (
          <div className="space-y-3">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className="w-full border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 font-semibold py-3 rounded-xl"
            >
              I already have an account
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl"
            >
              Create a new account
            </button>
            <div className="text-center mt-2">
              <button onClick={() => router.push('/trial/cart')} className="text-gray-400 text-sm hover:text-gray-600">
                ← Back to cart
              </button>
            </div>
          </div>
        )}

        {/* Login form */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email" value={loginForm.email}
                onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password" value={loginForm.password}
                onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button" onClick={() => { setMode('choice'); setError(''); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit" disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg"
              >
                {loading ? 'Signing in...' : 'Sign In →'}
              </button>
            </div>
          </form>
        )}

        {/* Register form */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            {trialParent ? (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600">Details from step 1</p>
                <p className="mt-2 font-medium text-gray-900">{trialParent.name}</p>
                <p className="text-sm text-gray-600">{trialParent.email}</p>
                <p className="text-sm text-gray-600">{trialParent.phone}</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input type="text" value={regForm.firstName} onChange={e => setRegForm(f => ({ ...f, firstName: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input type="text" value={regForm.lastName} onChange={e => setRegForm(f => ({ ...f, lastName: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={regForm.email} onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <input type="tel" value={regForm.phone} onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" placeholder="(416) 555-0100" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
              <input
                type="password" value={regForm.password}
                onChange={e => setRegForm(f => ({ ...f, password: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password *</label>
              <input
                type="password" value={regForm.confirm}
                onChange={e => setRegForm(f => ({ ...f, confirm: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button" onClick={() => { setMode('choice'); setError(''); }}
                className="flex-1 border border-gray-300 text-gray-700 py-2.5 rounded-lg hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit" disabled={loading}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg"
              >
                {loading ? 'Completing registration...' : 'Create Account →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
