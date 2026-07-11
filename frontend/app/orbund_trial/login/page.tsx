'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { orbundProxy } from '@/lib/orbundProxy';

type Mode = 'choice' | 'login' | 'register';

export default function OrbundLoginPage() {
  const router = useRouter();
  const [mode,      setMode]      = useState<Mode>('choice');
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [regForm,   setRegForm]   = useState({
    firstName: '', lastName: '', email: '', password: '', confirm: '', phone: '',
  });

  function sid() {
    return localStorage.getItem('orbund_session_id') || '';
  }

  async function afterAuth() {
    const sessionId = sid();
    try {
      await orbundProxy.saveGroupEnrollment(sessionId);
      const paymentInfo = await orbundProxy.collectPayment(sessionId);
      const isFree = !paymentInfo?.totalDue || parseFloat(String(paymentInfo.totalDue).replace(/[^0-9.]/g, '')) === 0;
      if (isFree) {
        router.push('/orbund_trial/thankyou');
      } else {
        sessionStorage.setItem('orbund_payment_info', JSON.stringify(paymentInfo));
        router.push('/orbund_trial/payment');
      }
    } catch {
      router.push('/orbund_trial/thankyou');
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) { setError('Please fill in all fields.'); return; }
    setLoading(true); setError('');

    try {
      const res = await orbundProxy.login(sid(), loginForm.email, loginForm.password);
      if (res?.error) {
        setError(res.error.message || 'Invalid email or password.');
        setLoading(false);
        return;
      }
      if (res?.sessionId) localStorage.setItem('orbund_session_id', res.sessionId);
      await afterAuth();
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

    try {
      const res = await orbundProxy.register(sid(), {
        username:  regForm.email,
        password:  regForm.password,
        firstName: regForm.firstName,
        lastName:  regForm.lastName,
        email:     regForm.email,
        cellPhone: regForm.phone,
      });
      if (res?.error) {
        setError(res.error.message || 'Registration failed. This email may already be in use.');
        setLoading(false);
        return;
      }
      if (res?.sessionId) localStorage.setItem('orbund_session_id', res.sessionId);
      await afterAuth();
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
          <p className="text-gray-500 mt-1">Step 4 of 6 — Sign in or create an account</p>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '67%' }} />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

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
              <button onClick={() => router.push('/orbund_trial/cart')} className="text-gray-400 text-sm hover:text-gray-600">
                ← Back to cart
              </button>
            </div>
          </div>
        )}

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
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg"
              >
                Sign In →
              </button>
            </div>
          </form>
        )}

        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                <input
                  type="text" value={regForm.firstName}
                  onChange={e => setRegForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                <input
                  type="text" value={regForm.lastName}
                  onChange={e => setRegForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input
                type="email" value={regForm.email}
                onChange={e => setRegForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel" value={regForm.phone}
                onChange={e => setRegForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="(416) 555-0100"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
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
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2.5 rounded-lg"
              >
                Create Account →
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
