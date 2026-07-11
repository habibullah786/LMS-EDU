'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

interface SchoolClass {
  id: number;
  curriculum: string;
  course: string;
  type: 'Trial' | 'Paid';
  date: string | null;
  time: string | null;
  instructor: string;
  available_slots: number;
  max_students: number;
  price: number;
}

interface CartStudent {
  uniqueId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  classIds: string[];
  _session: string;
  _type: 'Trial' | 'Paid';
  _price: number;
  _date: string | null;
  _time: string | null;
}

export default function ClassesPage() {
  const router = useRouter();
  const [classes, setClasses]           = useState<SchoolClass[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [cartStudents, setCartStudents] = useState<CartStudent[]>([]);
  const [selectedClass, setSelectedClass] = useState<SchoolClass | null>(null);
  const [showModal, setShowModal]       = useState(false);
  const [studentForm, setStudentForm]   = useState({ firstName: '', lastName: '', dateOfBirth: '' });
  const [modalError, setModalError]     = useState('');
  const [regSummary, setRegSummary]     = useState<{ locationLabel: string; ageLabel: string; course: string } | null>(null);
  const [waitlistMode, setWaitlistMode] = useState(false);
  const [waitlistSaving, setWaitlistSaving] = useState(false);
  const [waitlistJoined, setWaitlistJoined] = useState<Set<number>>(new Set());

  useEffect(() => {
    const reg = localStorage.getItem('trial_registration');
    if (!reg) { router.replace('/trial'); return; }

    const { locationLabel, ageLabel, course } = JSON.parse(reg);
    setRegSummary({ locationLabel, ageLabel, course });

    // Clear any leftover data from a previous flow
    sessionStorage.removeItem('cartStudents');
    sessionStorage.removeItem('thankYouData');
    localStorage.removeItem('lms_enrollment_id');
    setCartStudents([]);

    const params = new URLSearchParams();
    if (course)        params.set('course',    course);
    if (locationLabel) params.set('location',  locationLabel);
    if (ageLabel)      params.set('age_group', ageLabel);

    fetch(`${BASE}/trial/classes?${params}`)
      .then(r => r.json())
      .then((data: SchoolClass[]) => setClasses(Array.isArray(data) ? data : []))
      .catch(() => setError('Failed to load classes. Please go back and try again.'))
      .finally(() => setLoading(false));
  }, [router]);

  function openModal(cls: SchoolClass, waitlist = false) {
    setSelectedClass(cls);
    setStudentForm({ firstName: '', lastName: '', dateOfBirth: '' });
    setModalError('');
    setWaitlistMode(waitlist);
    setShowModal(true);
  }

  async function joinWaitlist() {
    if (!studentForm.firstName.trim()) { setModalError('Please enter first name.'); return; }
    if (!studentForm.lastName.trim())  { setModalError('Please enter last name.');  return; }
    if (!studentForm.dateOfBirth)      { setModalError('Please enter date of birth.'); return; }
    if (!selectedClass) return;

    const reg = localStorage.getItem('trial_registration');
    const { name, email, phone } = reg ? JSON.parse(reg) : { name: '', email: '', phone: '' };

    setWaitlistSaving(true);
    try {
      const res = await fetch(`${BASE}/school-classes/${selectedClass.id}/waitlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parent_name:    name,
          parent_email:   email,
          parent_phone:   phone,
          student_name:   `${studentForm.firstName.trim()} ${studentForm.lastName.trim()}`,
          date_of_birth:  studentForm.dateOfBirth,
        }),
      });
      if (!res.ok) throw new Error('Failed');
      setWaitlistJoined(prev => new Set(prev).add(selectedClass.id));
      setShowModal(false);
    } catch {
      setModalError('Failed to join waitlist. Please try again.');
    } finally {
      setWaitlistSaving(false);
    }
  }

  function addStudent() {
    if (!studentForm.firstName.trim()) { setModalError('Please enter first name.'); return; }
    if (!studentForm.lastName.trim())  { setModalError('Please enter last name.');  return; }
    if (!studentForm.dateOfBirth)      { setModalError('Please enter date of birth.'); return; }
    if (!selectedClass) return;

    const student: CartStudent = {
      uniqueId:    Date.now(),
      firstName:   studentForm.firstName.trim(),
      lastName:    studentForm.lastName.trim(),
      dateOfBirth: studentForm.dateOfBirth,
      classIds:    [String(selectedClass.id)],
      _session:    selectedClass.curriculum,
      _type:       selectedClass.type,
      _price:      selectedClass.price,
      _date:       selectedClass.date,
      _time:       selectedClass.time,
    };
    const updated = [...cartStudents, student];
    setCartStudents(updated);
    sessionStorage.setItem('cartStudents', JSON.stringify(updated));
    setShowModal(false);
  }

  function removeStudent(idx: number) {
    const updated = cartStudents.filter((_, i) => i !== idx);
    setCartStudents(updated);
    sessionStorage.setItem('cartStudents', JSON.stringify(updated));
  }

  function goToCart() {
    if (cartStudents.length === 0) { setError('Please add at least one student to continue.'); return; }
    router.push('/trial/cart');
  }

  const enrolled = (cls: SchoolClass) => cls.max_students - cls.available_slots;
  const isFull   = (cls: SchoolClass) => cls.available_slots <= 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Choose a Class</h1>
            <p className="text-gray-500">Step 2 of 7 — Select a trial class for your child</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '28%' }} />
          </div>
          {regSummary && (
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full">
                📍 {regSummary.locationLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full">
                🎓 {regSummary.course}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full">
                👦 {regSummary.ageLabel}
              </span>
              <button onClick={() => router.push('/trial')} className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors ml-1">
                ✏️ Change
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

        {/* Cart summary */}
        {cartStudents.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-4 mb-6">
            <h2 className="font-semibold text-gray-800 mb-3">Selected ({cartStudents.length})</h2>
            {cartStudents.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                <div>
                  <span className="font-medium">{s.firstName} {s.lastName}</span>
                  <span className="text-gray-500 text-sm ml-2">— {s._session}</span>
                </div>
                <button onClick={() => removeStudent(i)} className="text-red-500 hover:text-red-700 text-sm">Remove</button>
              </div>
            ))}
            <button onClick={goToCart} className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg">
              Proceed to Cart →
            </button>
          </div>
        )}

        {/* Class list */}
        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading available classes…</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">
            No classes available for the selected options.
            <br />
            <button onClick={() => router.push('/trial')} className="mt-4 text-indigo-600 underline text-sm">← Go Back</button>
          </div>
        ) : (
          <div className="grid gap-4">
            {classes.map(cls => (
              <div key={cls.id} className="bg-white rounded-2xl shadow p-5 flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="font-semibold text-gray-900">{cls.curriculum}</h3>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls.type === 'Trial' ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                      {cls.type === 'Trial' ? 'Free Trial' : `$${cls.price}`}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 space-y-0.5">
                    {cls.date && <div>📅 {new Date(cls.date + 'T00:00').toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</div>}
                    {cls.time && <div>🕐 {cls.time}</div>}
                    {cls.instructor && <div>👤 {cls.instructor}</div>}
                    <div className={`font-medium ${isFull(cls) ? 'text-red-500' : 'text-green-600'}`}>
                      {isFull(cls) ? 'Class Full' : `${cls.available_slots} spot${cls.available_slots !== 1 ? 's' : ''} available`}
                      <span className="text-gray-400 font-normal ml-1">({enrolled(cls)}/{cls.max_students} enrolled)</span>
                    </div>
                  </div>
                </div>
                <div className="ml-4 flex-shrink-0">
                  {!isFull(cls) ? (
                    <button onClick={() => openModal(cls)} className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg">
                      Add to Cart
                    </button>
                  ) : waitlistJoined.has(cls.id) ? (
                    <span className="text-green-600 text-sm font-medium">✓ On Waitlist</span>
                  ) : (
                    <button onClick={() => openModal(cls, true)} className="bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-lg">
                      Join Waitlist
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <button onClick={() => router.push('/trial')} className="text-indigo-600 text-sm hover:underline">← Back to registration</button>
        </div>
      </div>

      {/* Student modal */}
      {showModal && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-1">{waitlistMode ? 'Join Waitlist' : 'Add Student'}</h2>
            <p className="text-gray-500 text-sm mb-4">{selectedClass.curriculum}</p>
            {modalError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{modalError}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Child's First Name *</label>
                <input type="text" value={studentForm.firstName}
                  onChange={e => setStudentForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Child's Last Name *</label>
                <input type="text" value={studentForm.lastName}
                  onChange={e => setStudentForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                <input type="date" value={studentForm.dateOfBirth}
                  onChange={e => setStudentForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50">Cancel</button>
              {waitlistMode ? (
                <button onClick={joinWaitlist} disabled={waitlistSaving} className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold py-2 rounded-lg">
                  {waitlistSaving ? 'Joining…' : 'Join Waitlist'}
                </button>
              ) : (
                <button onClick={addStudent} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg">Add to Cart</button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
