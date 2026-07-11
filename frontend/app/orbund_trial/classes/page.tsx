'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { orbundProxy } from '@/lib/orbundProxy';

interface OrbundClass {
  classId: string | number;
  name?: string;
  courseName?: string;
  session?: string;
  schedule?: string;
  startDate?: string;
  endDate?: string;
  time?: string;
  availableSeats?: number;
  capacity?: number;
  tuition?: number;
  price?: number;
  [key: string]: unknown;
}

interface CartStudent {
  uniqueId: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  classIds: string[];
  _session: string;
  _price: number;
}

interface Reg {
  name: string;
  course: string;
  ageLabel: string;
  locationLabel: string;
  programId: string;
  levelId: string;
  campusType: string;
  semesterId: string;
}

function extractClasses(data: unknown): OrbundClass[] {
  if (!data) return [];
  if (Array.isArray(data)) return data as OrbundClass[];
  const obj = data as Record<string, unknown>;
  if (Array.isArray(obj.classes)) return obj.classes as OrbundClass[];
  if (Array.isArray(obj.courses)) return obj.courses as OrbundClass[];
  if (Array.isArray(obj.programs)) {
    const programs = obj.programs as Array<{ courses?: OrbundClass[]; classes?: OrbundClass[] }>;
    return programs.flatMap(p => p.courses || p.classes || []);
  }
  return [];
}

function classLabel(cls: OrbundClass): string {
  return String(cls.name || cls.courseName || cls.session || cls.classId);
}

function classTuition(cls: OrbundClass): number {
  return Number(cls.tuition ?? cls.price ?? 0);
}

export default function OrbundClassesPage() {
  const router = useRouter();
  const [classes,       setClasses]       = useState<OrbundClass[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState('');
  const [cartStudents,  setCartStudents]  = useState<CartStudent[]>([]);
  const [selectedClass, setSelectedClass] = useState<OrbundClass | null>(null);
  const [showModal,     setShowModal]     = useState(false);
  const [studentForm,   setStudentForm]   = useState({ firstName: '', lastName: '', dateOfBirth: '' });
  const [modalError,    setModalError]    = useState('');
  const [reg,           setReg]           = useState<Reg | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem('orbund_trial_reg');
    if (!raw) { router.replace('/orbund_trial'); return; }

    const parsed: Reg = JSON.parse(raw);
    setReg(parsed);

    sessionStorage.removeItem('orbund_cart');

    const sessionId = localStorage.getItem('orbund_session_id') || '';

    orbundProxy
      .getClasses(sessionId, {
        campusType: parsed.campusType,
        levelId:    parsed.levelId,
        programId:  parsed.programId,
        semesterId: parsed.semesterId,
      })
      .then((data: unknown) => {
        const list = extractClasses(data);
        setClasses(list);
      })
      .catch(() => setError('Failed to load classes. Please go back and try again.'))
      .finally(() => setLoading(false));
  }, [router]);

  function openModal(cls: OrbundClass) {
    setSelectedClass(cls);
    setStudentForm({ firstName: '', lastName: '', dateOfBirth: '' });
    setModalError('');
    setShowModal(true);
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
      classIds:    [String(selectedClass.classId)],
      _session:    classLabel(selectedClass),
      _price:      classTuition(selectedClass),
    };
    const updated = [...cartStudents, student];
    setCartStudents(updated);
    sessionStorage.setItem('orbund_cart', JSON.stringify(updated));
    setShowModal(false);
  }

  function removeStudent(idx: number) {
    const updated = cartStudents.filter((_, i) => i !== idx);
    setCartStudents(updated);
    sessionStorage.setItem('orbund_cart', JSON.stringify(updated));
  }

  function goToCart() {
    if (cartStudents.length === 0) { setError('Please add at least one student to continue.'); return; }
    router.push('/orbund_trial/cart');
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Choose a Class</h1>
            <p className="text-gray-500">Step 2 of 6 — Select a class for your child</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '33%' }} />
          </div>
          {reg && (
            <div className="flex flex-wrap gap-2 justify-center">
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full">
                📍 {reg.locationLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full">
                🎓 {reg.course}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-indigo-50 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-full">
                👦 {reg.ageLabel}
              </span>
              <button
                onClick={() => router.push('/orbund_trial')}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors ml-1"
              >
                ✏️ Change
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">{error}</div>
        )}

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
            <button
              onClick={goToCart}
              className="mt-4 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg"
            >
              Proceed to Cart →
            </button>
          </div>
        )}

        {loading ? (
          <div className="text-center py-16">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Loading available classes…</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="bg-white rounded-2xl shadow p-8 text-center text-gray-500">
            No classes available for the selected options.
            <br />
            <button onClick={() => router.push('/orbund_trial')} className="mt-4 text-indigo-600 underline text-sm">← Go Back</button>
          </div>
        ) : (
          <div className="grid gap-4">
            {classes.map((cls, i) => {
              const tuition = classTuition(cls);
              const seats = Number(cls.availableSeats ?? cls.capacity ?? 99);
              const full = seats <= 0;
              return (
                <div key={i} className="bg-white rounded-2xl shadow p-5 flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{classLabel(cls)}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tuition === 0 ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'}`}>
                        {tuition === 0 ? 'Free' : `$${tuition}`}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500 space-y-0.5">
                      {(cls.startDate || cls.schedule) && (
                        <div>📅 {cls.startDate || cls.schedule}</div>
                      )}
                      {cls.time && <div>🕐 {cls.time}</div>}
                      {seats < 99 && (
                        <div className={`font-medium ${full ? 'text-red-500' : 'text-green-600'}`}>
                          {full ? 'Class Full' : `${seats} spot${seats !== 1 ? 's' : ''} available`}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    {!full ? (
                      <button
                        onClick={() => openModal(cls)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg"
                      >
                        Add to Cart
                      </button>
                    ) : (
                      <span className="text-gray-400 text-sm">Full</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-6">
          <button onClick={() => router.push('/orbund_trial')} className="text-indigo-600 text-sm hover:underline">
            ← Back to registration
          </button>
        </div>
      </div>

      {showModal && selectedClass && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold mb-1">Add Student</h2>
            <p className="text-gray-500 text-sm mb-4">{classLabel(selectedClass)}</p>
            {modalError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">{modalError}</div>
            )}
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Child's First Name *</label>
                <input
                  type="text" value={studentForm.firstName}
                  onChange={e => setStudentForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Child's Last Name *</label>
                <input
                  type="text" value={studentForm.lastName}
                  onChange={e => setStudentForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
                <input
                  type="date" value={studentForm.dateOfBirth}
                  onChange={e => setStudentForm(f => ({ ...f, dateOfBirth: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={addStudent} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-lg">
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
