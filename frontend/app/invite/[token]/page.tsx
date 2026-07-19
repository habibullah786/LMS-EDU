'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { API_BASE_URL } from '@/lib/apiClient';

export default function AcceptStaffInvitationPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invite, setInvite] = useState<{ name: string; email: string; access_level: string } | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => { fetch(`${API_BASE_URL}/staff-invitations/${encodeURIComponent(token)}`).then(async r => { const data = await r.json(); if (!r.ok) throw new Error(data.message); setInvite(data); }).catch(e => setMessage(e.message || 'Invitation is invalid.')); }, [token]);

  const accept = async () => {
    setMessage('');
    const response = await fetch(`${API_BASE_URL}/staff-invitations/${encodeURIComponent(token)}/accept`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password, password_confirmation: confirmation }) });
    const data = await response.json();
    if (!response.ok) { setMessage(data.message || 'Unable to accept invitation.'); return; }
    setMessage(data.message); setTimeout(() => router.push('/admin/login'), 1200);
  };

  return <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4"><section className="w-full max-w-md rounded-2xl bg-white p-7 shadow-lg"><h1 className="text-2xl font-bold">Accept staff invitation</h1>{invite && <><p className="mt-2 text-sm text-slate-600">{invite.name} · {invite.email} · {invite.access_level.replaceAll('_', ' ')}</p><div className="mt-6 space-y-3"><input className="input-field" type="password" placeholder="Password (minimum 8 characters)" value={password} onChange={e => setPassword(e.target.value)} /><input className="input-field" type="password" placeholder="Confirm password" value={confirmation} onChange={e => setConfirmation(e.target.value)} /><button onClick={accept} disabled={password.length < 8 || password !== confirmation} className="w-full rounded-xl bg-blue-700 p-3 font-semibold text-white disabled:opacity-40">Accept invitation</button></div></>}{message && <p className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-800">{message}</p>}</section></main>;
}
