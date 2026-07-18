'use client';

import { API_BASE_URL } from '@/lib/apiClient';

import { useAuth } from '@/app/context/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState, FormEvent } from 'react';

const API_URL = API_BASE_URL;

type View = 'overview' | 'enrollments' | 'profile';

type StudentRow = {
  childName: string;
  dob: string;
  className: string;
  course: string;
  type: 'Trial' | 'Paid';
  location: string;
  instructor: string;
  price: number;
  bookingDate: string;
  status: string;
  enrollmentId: string;
};

type Enrollment = {
  id: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  students: Array<{
    name: string;
    dob: string;
    classId?: string;
    className: string;
    course: string;
    location: string;
    instructor: string;
    price: number;
    type: 'Trial' | 'Paid';
  }>;
  totalAmount: number;
  bookingDate: string;
  status: string;
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const IcoHome = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);
const IcoList = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" />
    <line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
  </svg>
);
const IcoUser = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);
const IcoLogout = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);
const IcoCheck = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);
const IcoEye = ({ show }: { show: boolean }) => show ? (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
  </svg>
) : (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

// ── Sidebar button ─────────────────────────────────────────────────────────────
function SidebarBtn({ icon, label, active, onClick, badge }: {
  icon: React.ReactNode; label: string; active: boolean;
  onClick: () => void; badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
        active
          ? 'bg-white/15 text-white'
          : 'text-white/70 hover:bg-white/10 hover:text-white'
      }`}
    >
      {icon}
      <span className="flex-1 text-left">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="bg-white/20 text-white text-xs rounded-full px-2 py-0.5">{badge}</span>
      )}
    </button>
  );
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'confirmed' ? 'bg-green-100 text-green-700' :
    status === 'pending'   ? 'bg-yellow-100 text-yellow-700' :
                             'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function ParentDashboard() {
  const { user, isAuthenticated, isLoading, logout, updateProfile, changePassword } = useAuth();
  const router = useRouter();

  const [view, setView] = useState<View>('overview');
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'Trial' | 'Paid'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'confirmed' | 'pending' | 'cancelled'>('all');

  // Profile form
  const [profileName, setProfileName] = useState('');
  const [profilePhone, setProfilePhone] = useState('');
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [profileSaving, setProfileSaving] = useState(false);

  // Password form
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [pwMsg, setPwMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push('/');
  }, [isAuthenticated, isLoading, router]);

  // Populate profile form when user loads
  useEffect(() => {
    if (user) {
      setProfileName(user.name ?? '');
      setProfilePhone(user.phone ?? '');
    }
  }, [user]);

  // Fetch enrollments filtered to this parent
  useEffect(() => {
    if (!user) return;
    setEnrollLoading(true);
    const token = localStorage.getItem('auth_token');

    fetch(`${API_URL}/enrollments`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(data => {
        const raw: Record<string, unknown>[] = Array.isArray(data) ? data : (data.data ?? []);

        const mapped: Enrollment[] = raw
          .filter((e) => {
            const email = (e.parent_email ?? e.parentEmail) as string | undefined;
            return !email || email === user.email;
          })
          .map((e) => {
            // Regular paid students
            const paidStudents = ((e.students ?? []) as Record<string, unknown>[]).map(s => ({
              name:       String(s.student_name ?? s.name ?? ''),
              dob:        String(s.dob ?? s.date_of_birth ?? ''),
              classId:    String(s.class_id ?? s.classId ?? ''),
              className:  String(s.class_name ?? s.className ?? ''),
              course:     String(s.course ?? ''),
              location:   String(s.location ?? ''),
              instructor: String(s.instructor ?? ''),
              price:      Number(s.price ?? 0),
              type:       'Paid' as const,
            }));

            // Trial students
            const trialStudents = ((e.trial_students ?? e.trialStudents ?? []) as Record<string, unknown>[]).map(s => ({
              name:       `${s.first_name ?? ''} ${s.last_name ?? ''}`.trim(),
              dob:        String(s.date_of_birth ?? s.dob ?? ''),
              classId:    String(s.orbund_class_id ?? s.classId ?? ''),
              className:  String(s.orbund_class_id ?? s.class_name ?? s.className ?? ''),
              course:     String(s.course ?? ''),
              location:   String(s.location ?? ''),
              instructor: '',
              price:      Number(s.price ?? 0),
              type:       'Trial' as const,
            }));

            return {
              id:          String(e.id ?? ''),
              parentName:  String(e.parent_name  ?? e.parentName  ?? ''),
              parentEmail: String(e.parent_email ?? e.parentEmail ?? ''),
              parentPhone: String(e.parent_phone ?? e.parentPhone ?? ''),
              students:    [...paidStudents, ...trialStudents],
              totalAmount: Number(e.total_amount ?? e.totalAmount ?? 0),
              bookingDate: String(e.booking_date ?? e.bookingDate ?? e.created_at ?? ''),
              status:      String(e.status ?? 'pending'),
            };
          });

        setEnrollments(mapped);
      })
      .catch(() => setEnrollments([]))
      .finally(() => setEnrollLoading(false));
  }, [user]);

  // Flatten enrollments → individual child rows
  const allRows: StudentRow[] = enrollments.flatMap(e =>
    (e.students ?? []).map(s => ({
      enrollmentId: e.id,
      childName: s.name,
      dob: s.dob,
      className: s.className,
      course: s.course,
      type: s.type,
      location: s.location,
      instructor: s.instructor,
      price: s.price,
      bookingDate: e.bookingDate,
      status: e.status,
    }))
  );

  const filteredRows = allRows.filter(r => {
    if (typeFilter !== 'all' && r.type !== typeFilter) return false;
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const trialCount    = allRows.filter(r => r.type === 'Trial').length;
  const confirmedCount = allRows.filter(r => r.status === 'confirmed').length;

  const handleProfileSave = async (e: FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileMsg(null);
    try {
      await updateProfile(profileName.trim(), profilePhone.trim());
      setProfileMsg({ text: 'Profile updated successfully.', ok: true });
    } catch {
      setProfileMsg({ text: 'Failed to update profile.', ok: false });
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordSave = async (e: FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (newPw !== confirmPw) {
      setPwMsg({ text: 'New passwords do not match.', ok: false });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ text: 'Password must be at least 8 characters.', ok: false });
      return;
    }
    setPwSaving(true);
    try {
      await changePassword(currentPw, newPw);
      setPwMsg({ text: 'Password changed successfully.', ok: true });
      setCurrentPw(''); setNewPw(''); setConfirmPw('');
    } catch (err) {
      setPwMsg({ text: err instanceof Error ? err.message : 'Failed to change password.', ok: false });
    } finally {
      setPwSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f0f2f5]">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated || !user) return null;

  const initials = (user.name ?? '?').charAt(0).toUpperCase();
  const recentRows = allRows.slice(0, 4);

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f2f5]">
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className="w-60 flex-shrink-0 flex flex-col"
        style={{ background: '#1e3f8b' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <span className="text-[#1e3f8b] font-black text-sm">ER</span>
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">Exceed Robotics</p>
              <p className="text-white/50 text-[10px]">Parent Portal</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <SidebarBtn icon={<IcoHome />}  label="Overview"       active={view === 'overview'}    onClick={() => setView('overview')} />
          <SidebarBtn icon={<IcoList />}  label="My Children's Classes" active={view === 'enrollments'} onClick={() => setView('enrollments')} badge={allRows.length} />
          <SidebarBtn icon={<IcoUser />}  label="Profile"        active={view === 'profile'}     onClick={() => setView('profile')} />
        </nav>

        {/* User + logout */}
        <div className="px-3 py-4 border-t border-white/10 space-y-1">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="overflow-hidden">
              <p className="text-white text-sm font-medium truncate">{user.name}</p>
              <p className="text-white/50 text-xs truncate">{user.email}</p>
            </div>
          </div>
          <SidebarBtn icon={<IcoLogout />} label="Log out" active={false} onClick={() => { logout(); router.push('/'); }} />
        </div>
      </aside>

      {/* ── Main area ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto p-8 pt-0">

          {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
          {view === 'overview' && (
            <div className="space-y-6 max-w-5xl">
              <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-700 p-7 text-white shadow-[0_25px_80px_-35px_rgba(15,23,42,0.75)]">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.3em] text-blue-200">Welcome back</p>
                    <h2 className="mt-2 text-2xl font-semibold">{user.name} 👋</h2>
                    <p className="mt-2 max-w-2xl text-sm text-blue-100/90">
                      {allRows.length === 0
                        ? 'No classes registered yet. Book a free trial to get started.'
                        : `You have ${allRows.length} ${allRows.length === 1 ? 'registration' : 'registrations'} in your account, with ${trialCount} trial class${trialCount === 1 ? '' : 'es'} ready to review.`}
                    </p>
                  </div>
                  <button onClick={() => router.push('/trial')} className="inline-flex items-center justify-center rounded-full bg-white/15 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/25">
                    Browse trial classes
                  </button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { label: 'Registrations', value: allRows.length, color: 'text-blue-600', bg: 'bg-blue-50' },
                  { label: 'Trial Classes', value: trialCount, color: 'text-orange-600', bg: 'bg-orange-50' },
                  { label: 'Confirmed', value: confirmedCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                ].map(s => (
                  <div key={s.label} className={`${s.bg} rounded-3xl border border-slate-200/80 p-5 shadow-sm`}>
                    <p className={`text-3xl font-semibold ${s.color}`}>{s.value}</p>
                    <p className="mt-2 text-sm font-medium text-slate-600">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
                <div className="dashboard-card p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="font-semibold text-slate-900">Recent registrations</h3>
                      <p className="dashboard-subtle mt-1">Your latest class bookings at a glance</p>
                    </div>
                    {allRows.length > 0 && (
                      <button onClick={() => setView('enrollments')} className="text-sm font-medium text-blue-600 hover:text-blue-700">
                        View all
                      </button>
                    )}
                  </div>

                  {enrollLoading ? (
                    <div className="flex items-center gap-2 text-sm text-slate-400 py-4">
                      <div className="w-4 h-4 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                      Loading…
                    </div>
                  ) : allRows.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                      <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white shadow-sm">
                        <IcoList />
                      </div>
                      <p className="text-sm font-medium text-slate-600">No registrations yet</p>
                      <button onClick={() => router.push('/trial')} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                        Browse trial classes →
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {recentRows.map((r, i) => (
                        <div key={i} className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 transition-colors hover:bg-white">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                            {(r.childName ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">{r.childName}</p>
                            <p className="text-xs text-slate-500 truncate">{r.className} · {r.course}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${r.type === 'Trial' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
                              {r.type}
                            </span>
                            <StatusBadge status={r.status} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  <div className="dashboard-card p-6">
                    <h3 className="text-lg font-semibold text-slate-900">Helpful next steps</h3>
                    <div className="mt-4 space-y-2">
                      <button onClick={() => setView('enrollments')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700">
                        <span>Review your children’s classes</span>
                        <span>→</span>
                      </button>
                      <button onClick={() => setView('profile')} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition-colors hover:border-blue-500 hover:bg-blue-50 hover:text-blue-700">
                        <span>Update profile details</span>
                        <span>→</span>
                      </button>
                    </div>
                  </div>

                  <div className="dashboard-card p-6">
                    <h3 className="text-lg font-semibold text-slate-900">Account status</h3>
                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
                      <p className="font-medium text-slate-900">All set</p>
                      <p className="mt-1">Your parent account is active and ready for class updates, booking history, and profile management.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ ENROLLMENTS ═══════════════════════════════════════════════════ */}
          {view === 'enrollments' && (
            <div className="space-y-5 max-w-5xl">
              {/* Filters */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <div className="flex flex-wrap gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2">Type</p>
                    <div className="flex gap-2">
                      {(['all', 'Trial', 'Paid'] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setTypeFilter(t)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            typeFilter === t
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {t === 'all' ? 'All types' : t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium mb-2">Status</p>
                    <div className="flex gap-2 flex-wrap">
                      {(['all', 'confirmed', 'pending', 'cancelled'] as const).map(s => (
                        <button
                          key={s}
                          onClick={() => setStatusFilter(s)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            statusFilter === s
                              ? 'bg-primary text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                        >
                          {s === 'all' ? 'All statuses' : s}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {enrollLoading ? (
                  <div className="flex items-center justify-center gap-3 py-16 text-gray-400">
                    <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                    Loading registrations…
                  </div>
                ) : filteredRows.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                      <IcoList />
                    </div>
                    <p className="text-gray-700 font-medium">No registrations found</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {allRows.length > 0 ? 'Try adjusting the filters above.' : 'Book a free trial class to get started.'}
                    </p>
                    {allRows.length === 0 && (
                      <button
                        onClick={() => router.push('/trial')}
                        className="mt-4 inline-flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-primary/90 transition-colors"
                      >
                        Browse trial classes →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs text-gray-500 font-medium bg-gray-50/60">
                          {['Child', 'Class', 'Course', 'Type', 'Location', 'Booked On', 'Status'].map(h => (
                            <th key={h} className="px-5 py-3">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {filteredRows.map((r, i) => (
                          <tr key={i} className="hover:bg-gray-50/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-xs font-semibold text-primary">
                                    {(r.childName ?? '?').charAt(0).toUpperCase()}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">{r.childName}</p>
                                  {r.dob && (
                                    <p className="text-[11px] text-gray-400">
                                      DOB: {new Date(r.dob).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-3.5 text-gray-700 font-medium max-w-[200px] truncate">{r.className}</td>
                            <td className="px-5 py-3.5 text-gray-500">{r.course}</td>
                            <td className="px-5 py-3.5">
                              <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                r.type === 'Trial' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                              }`}>{r.type}</span>
                            </td>
                            <td className="px-5 py-3.5 text-gray-500">{r.location || '—'}</td>
                            <td className="px-5 py-3.5 text-gray-400 text-xs">
                              {new Date(r.bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </td>
                            <td className="px-5 py-3.5">
                              <StatusBadge status={r.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ PROFILE ═══════════════════════════════════════════════════════ */}
          {view === 'profile' && (
            <div className="max-w-3xl space-y-6">

              {/* Update Profile */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Personal Information</h3>
                <p className="text-sm text-gray-400 mb-6">Update your name and phone number.</p>

                <form onSubmit={handleProfileSave} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Full Name</label>
                      <input
                        type="text"
                        value={profileName}
                        onChange={e => setProfileName(e.target.value)}
                        required
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                        placeholder="Your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">Phone Number</label>
                      <input
                        type="tel"
                        value={profilePhone}
                        onChange={e => setProfilePhone(e.target.value)}
                        className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                        placeholder="+91 98765 43210"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1.5">Email Address</label>
                    <input
                      type="email"
                      value={user.email}
                      readOnly
                      className="w-full border border-gray-100 rounded-xl px-3.5 py-2.5 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
                    />
                    <p className="text-[11px] text-gray-400 mt-1">Email cannot be changed.</p>
                  </div>

                  {profileMsg && (
                    <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 ${
                      profileMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {profileMsg.ok && <IcoCheck />}
                      {profileMsg.text}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={profileSaving}
                      className="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors"
                    >
                      {profileSaving ? 'Saving…' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Change Password */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-7">
                <h3 className="text-base font-semibold text-gray-900 mb-1">Change Password</h3>
                <p className="text-sm text-gray-400 mb-6">Use a strong password of at least 8 characters.</p>

                <form onSubmit={handlePasswordSave} className="space-y-4">
                  {[
                    { key: 'current', label: 'Current Password',  value: currentPw, set: setCurrentPw },
                    { key: 'new',     label: 'New Password',       value: newPw,     set: setNewPw },
                    { key: 'confirm', label: 'Confirm New Password', value: confirmPw, set: setConfirmPw },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="block text-xs font-medium text-gray-600 mb-1.5">{f.label}</label>
                      <div className="relative">
                        <input
                          type={showPw[f.key] ? 'text' : 'password'}
                          value={f.value}
                          onChange={e => f.set(e.target.value)}
                          required
                          className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors"
                          placeholder="••••••••"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPw(p => ({ ...p, [f.key]: !p[f.key] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <IcoEye show={!!showPw[f.key]} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {pwMsg && (
                    <div className={`flex items-center gap-2 text-sm rounded-xl px-4 py-3 ${
                      pwMsg.ok ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'
                    }`}>
                      {pwMsg.ok && <IcoCheck />}
                      {pwMsg.text}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={pwSaving}
                      className="bg-primary text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-primary/90 disabled:opacity-60 transition-colors"
                    >
                      {pwSaving ? 'Updating…' : 'Update Password'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
