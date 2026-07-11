'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/app/context/AuthContext';

type Student = {
  id: string;
  name: string;
  dob: string;
  grade?: string;
  notes?: string;
  createdAt: string;
};

const STORAGE_KEY = 'lmsedu_students';

const getStoredStudents = (): Student[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];

  try {
    return JSON.parse(stored) as Student[];
  } catch {
    return [];
  }
};

const saveStudents = (students: Student[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
};

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    grade: '',
    notes: '',
  });
  const [message, setMessage] = useState('');

  useEffect(() => {
    setStudents(getStoredStudents());
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      dob: '',
      grade: '',
      notes: '',
    });
    setEditingStudent(null);
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (student: Student) => {
    setFormData({
      name: student.name,
      dob: student.dob,
      grade: student.grade || '',
      notes: student.notes || '',
    });
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    resetForm();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.dob) {
      setMessage('Please enter your child\'s name and date of birth.');
      return;
    }

    const studentData: Student = {
      id: editingStudent?.id || `student-${Date.now()}`,
      name: formData.name.trim(),
      dob: formData.dob,
      grade: formData.grade.trim() || undefined,
      notes: formData.notes.trim() || undefined,
      createdAt: editingStudent?.createdAt || new Date().toISOString(),
    };

    const updatedStudents = editingStudent
      ? students.map(s => s.id === editingStudent.id ? studentData : s)
      : [...students, studentData];

    setStudents(updatedStudents);
    saveStudents(updatedStudents);
    setMessage(editingStudent ? 'Student updated successfully!' : 'Student added successfully!');
    closeModal();

    setTimeout(() => setMessage(''), 3000);
  };

  const handleDelete = (studentId: string) => {
    if (confirm('Are you sure you want to delete this student?')) {
      const updatedStudents = students.filter(s => s.id !== studentId);
      setStudents(updatedStudents);
      saveStudents(updatedStudents);
      setMessage('Student deleted successfully!');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  return (
    <div className="min-h-screen bg-light py-12">
      <div className="section-container">
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-10">
            <div className="w-full max-w-2xl rounded-[32px] bg-white p-8 shadow-2xl">
              <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-primary font-semibold">Student details</p>
                  <h2 className="mt-2 text-2xl font-semibold text-gray-900">
                    {editingStudent ? 'Edit student' : 'Add new student'}
                  </h2>
                  <p className="mt-2 text-sm text-gray-600 max-w-2xl">
                    {editingStudent ? 'Update your child\'s information.' : 'Add your child\'s details to book classes for them.'}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-3xl leading-none text-gray-400 hover:text-gray-900"
                  onClick={closeModal}
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                {message && (
                  <div className="rounded-2xl bg-red-50 border border-red-200 p-4 text-sm text-red-700">
                    {message}
                  </div>
                )}

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Child name *</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g. Aarav Sharma"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Date of birth *</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.dob}
                    onChange={(e) => setFormData(prev => ({ ...prev, dob: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Grade/Class (optional)</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.grade}
                    onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                    placeholder="e.g. 3rd Grade"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-700 mb-2">Notes (optional)</label>
                  <textarea
                    className="input-field"
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any special notes or requirements..."
                    rows={3}
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    className="btn-secondary w-full sm:w-auto"
                    onClick={closeModal}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary w-full sm:w-auto">
                    {editingStudent ? 'Update student' : 'Add student'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="max-w-6xl mx-auto space-y-8">
          <div className="rounded-3xl bg-white p-10 shadow-xl">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-primary font-semibold">Students</p>
                <h1 className="text-4xl font-bold text-gray-900 mt-3">Manage your children</h1>
                <p className="mt-2 text-gray-600 max-w-2xl">
                  Add and manage your children's profiles to easily book classes for them.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/trial" className="btn-outline w-full sm:w-auto text-center">
                  Book a Trial Class
                </Link>
                <button onClick={openAddModal} className="btn-primary w-full sm:w-auto text-center">
                  Add student
                </button>
              </div>
            </div>

            {message && (
              <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-4 text-green-800">
                {message}
              </div>
            )}

            {students.length === 0 ? (
              <div className="mt-10 rounded-3xl border border-dashed border-gray-300 bg-gray-50 p-10 text-center">
                <p className="text-xl font-semibold text-gray-900">No students added yet.</p>
                <p className="mt-3 text-gray-600">Add your children's profiles to start booking classes.</p>
                <button onClick={openAddModal} className="btn-primary mt-6">
                  Add your first student
                </button>
              </div>
            ) : (
              <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {students.map((student) => (
                  <article key={student.id} className="rounded-3xl bg-white p-6 shadow-lg border border-gray-100">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="text-xl font-semibold text-gray-900">{student.name}</h3>
                        <p className="mt-1 text-sm text-gray-600">
                          DOB: {new Date(student.dob).toLocaleDateString()}
                        </p>
                        {student.grade && (
                          <p className="mt-1 text-sm text-gray-600">Grade: {student.grade}</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditModal(student)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                          title="Edit student"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(student.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Delete student"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                            <path d="M3 6h18" />
                            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {student.notes && (
                      <div className="mt-4 rounded-2xl bg-light p-4">
                        <p className="text-sm text-gray-500">Notes</p>
                        <p className="mt-1 text-sm text-gray-700">{student.notes}</p>
                      </div>
                    )}

                    <div className="mt-4 text-xs text-gray-500">
                      Added {new Date(student.createdAt).toLocaleDateString()}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}