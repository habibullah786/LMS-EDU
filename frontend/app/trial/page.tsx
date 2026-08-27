'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { orbund } from '@/lib/orbund';
import { lmsApi } from '@/lib/lmsApi';

type Location  = { id: number; name: string; orbund_campus_type: string };
type AgeGroup  = { id: number; name: string; course: string; orbund_program_id: string; orbund_level_id: string };
type Config    = { locations: Location[]; age_groups: AgeGroup[]; semester_id: string };

export default function TrialRegistrationPage() {
  const router = useRouter();

  const [config,     setConfig]     = useState<Config | null>(null);
  const [configErr,  setConfigErr]  = useState('');
  const [campusType, setCampusType] = useState('');
  const [course,     setCourse]     = useState('');
  const [ageGroupId, setAgeGroupId] = useState('');
  const [name,       setName]       = useState('');
  const [email,      setEmail]      = useState('');
  const [phone,      setPhone]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  const [lockedUser, setLockedUser] = useState(false);
  const [lockedPhone, setLockedPhone] = useState(false);
  const [emailConsent, setEmailConsent] = useState(false);
  const [smsConsent, setSmsConsent] = useState(false);

  useEffect(() => {
    // Load trial config, Orbund session, and logged-in user in parallel
    Promise.all([
      lmsApi.trialConfig().then(data => setConfig(data)).catch(() => setConfigErr('Failed to load form options. Please refresh.')),
      orbund.getSessionId().then(id => {
        localStorage.setItem('orbund_session_id', id);
      }).catch(() => {}),
      lmsApi.me().then(user => {
        if (user) {
          setName(user.name || '');
          setEmail(user.email || '');
          setPhone(user.phone || '');
          setLockedUser(true);
          setLockedPhone(!!user.phone);
        }
      }).catch(() => {}),
    ]);
  }, []);

  function validate(): string {
    if (!name.trim())  return 'Please enter your name.';
    if (!email.trim()) return 'Please enter your email.';
    if (!/\S+@\S+\.\S+/.test(email)) return 'Please enter a valid email.';
    if (!phone.trim()) return 'Please enter your phone number.';
    if (!course)       return 'Please select a course.';
    if (!ageGroupId)   return 'Please select your child\'s age group.';
    if (!campusType)   return 'Please select a location.';
    return '';
  }

  const filteredAgeGroups = config?.age_groups.filter(a => a.course === course) ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);

    const ageGroup  = config!.age_groups.find(a => String(a.id) === ageGroupId)!;
    const location  = config!.locations.find(l => l.orbund_campus_type === campusType)!;
    const pageUrl   = ageGroup.course === 'Coding' ? 'coding_trial' : 'robotics_trial';

    // Persist registration details for subsequent steps
    const detail = {
      name, email, phone,
      programId:     ageGroup.orbund_program_id,
      levelId:       ageGroup.orbund_level_id,
      campusType:    location.orbund_campus_type,
      semesterId:    config!.semester_id,
      course:        ageGroup.course,
      ageLabel:      ageGroup.name,
      locationLabel: location.name,
      pageUrl,
    };
    try {
      const lead = await lmsApi.captureLead({
        name, email, phone, age_group: ageGroup.name, course: ageGroup.course,
        location: location.name, orbund_program_id: ageGroup.orbund_program_id,
        orbund_campus_type: location.orbund_campus_type, level_id: ageGroup.orbund_level_id,
        semester_id: config!.semester_id, source: 'trial', page_url: pageUrl,
        orbund_session_id: localStorage.getItem('orbund_session_id') || undefined,
        children_count: 1, course_interest_count: 1,
        marketing_email_consent: emailConsent, marketing_sms_consent: smsConsent,
      });
      localStorage.setItem('lms_lead_id', String(lead.lead_id));
    } catch (leadError) {
      setError(leadError instanceof Error ? leadError.message : 'Unable to save your details.');
      setLoading(false);
      return;
    }
    localStorage.setItem('trial_registration', JSON.stringify(detail));

    router.push('/trial/classes');
  }

  if (configErr) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-600 font-medium">{configErr}</p>
          <button onClick={() => window.location.reload()} className="mt-4 text-indigo-600 underline text-sm">Refresh</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🤖</div>
          <h1 className="text-2xl font-bold text-gray-900">Book a Free Trial Class</h1>
          <p className="text-gray-500 mt-1">Step 1 of 7 — Tell us about yourself and your child</p>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-2 mb-8">
          <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '14%' }} />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {!config ? (
          <div className="text-center py-8">
            <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-gray-400 text-sm">Loading form…</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {lockedUser && (
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-sm text-green-700">
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Signed in as <strong className="ml-1">{email}</strong>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent / Guardian Name *</label>
              <input
                type="text" value={name}
                onChange={e => !lockedUser && setName(e.target.value)}
                readOnly={lockedUser}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none ${lockedUser ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300 focus:ring-2 focus:ring-indigo-500'}`}
                placeholder="Jane Smith"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
              <input
                type="email" value={email}
                onChange={e => !lockedUser && setEmail(e.target.value)}
                readOnly={lockedUser}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none ${lockedUser ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300 focus:ring-2 focus:ring-indigo-500'}`}
                placeholder="jane@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number *</label>
              <input
                type="tel" value={phone}
                onChange={e => !lockedPhone && setPhone(e.target.value)}
                readOnly={lockedPhone}
                className={`w-full border rounded-lg px-3 py-2 focus:outline-none ${lockedPhone ? 'bg-gray-50 border-gray-200 text-gray-500 cursor-not-allowed' : 'border-gray-300 focus:ring-2 focus:ring-indigo-500'}`}
                placeholder="(416) 555-0100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Course *</label>
              <select
                value={course}
                onChange={e => { setCourse(e.target.value); setAgeGroupId(''); }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Select Course —</option>
                {Array.from(new Set(config.age_groups.map(a => a.course))).map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Child&apos;s Age Group *</label>
              <select
                value={ageGroupId}
                onChange={e => setAgeGroupId(e.target.value)}
                disabled={!course}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">— Select Age Group —</option>
                {filteredAgeGroups.map(a => (
                  <option key={a.id} value={String(a.id)}>{a.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <select
                value={campusType} onChange={e => setCampusType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">— Select Location —</option>
                {config.locations.map(l => (
                  <option key={l.id} value={l.orbund_campus_type}>{l.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              <p className="font-medium text-gray-700">Optional updates</p>
              <label className="flex items-start gap-2"><input type="checkbox" checked={emailConsent} onChange={e => setEmailConsent(e.target.checked)} className="mt-1" /><span>Email me about future classes and programs. I can unsubscribe anytime.</span></label>
              <label className="flex items-start gap-2"><input type="checkbox" checked={smsConsent} onChange={e => setSmsConsent(e.target.checked)} className="mt-1" /><span>Text me about future classes and programs. Message rates may apply; reply STOP to opt out.</span></label>
            </div>

            <button
              type="submit" disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors mt-2"
            >
              {loading ? 'Please wait…' : 'Find Available Classes →'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
