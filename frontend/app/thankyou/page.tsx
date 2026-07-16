'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

type ClassItem = {
  id: string;
  curriculum: string;
  location: string;
  ageGroup: string;
  course: string;
  type: 'Trial' | 'Paid';
  semester: string;
  price: number;
  dateTime: string;
  availableSlots: number;
  instructor: string;
  maxStudents: number;
};

type CartEntry = {
  classId: string;
  childName: string;
  childDob: string;
  addedAt: string;
};

type BookingDetails = {
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  cartItems: Array<{
    entry: CartEntry;
    classItem: ClassItem | null;
  }>;
  totalAmount: number;
  bookingDate: string;
};

export default function ThankYouPage() {
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('lmsedu_booking_details');
    if (stored) {
      try {
        const details = JSON.parse(stored) as BookingDetails;
        setBookingDetails(details);
      } catch (error) {
        console.error('Error parsing booking details:', error);
      }
    }
  }, []);

  if (!bookingDetails) {
    return (
      <div className="min-h-screen bg-light py-12">
        <div className="section-container">
          <div className="max-w-4xl mx-auto text-center">
            <div className="rounded-3xl bg-white p-10 shadow-xl">
              <p className="text-xl font-semibold text-gray-900">No booking details found.</p>
              <p className="mt-3 text-gray-600">Please complete the checkout process first.</p>
              <Link href="/trial" className="btn-primary mt-6 inline-block">
                Book a Trial Class
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-light py-12">
      <div className="section-container">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="rounded-3xl bg-white p-10 shadow-xl text-center">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-6">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-green-600">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22,4 12,14.01 9,11.01" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold text-gray-900">Thank you for your booking!</h1>
            <p className="mt-4 text-lg text-gray-600">
              Your classes have been successfully booked. Here are the details:
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-3xl bg-white p-8 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Parent Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Parent Name</p>
                  <p className="font-semibold text-gray-900">{bookingDetails.parentName}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <p className="font-semibold text-gray-900">{bookingDetails.parentEmail}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <p className="font-semibold text-gray-900">{bookingDetails.parentPhone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Booking Date</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(bookingDetails.bookingDate).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-white p-8 shadow-lg">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Booking Summary</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Total Classes</p>
                  <p className="font-semibold text-gray-900">{bookingDetails.cartItems.length} class(es)</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-semibold text-gray-900">
                    {bookingDetails.totalAmount === 0 ? 'Free' : `₹${bookingDetails.totalAmount}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Payment Status</p>
                  <p className="font-semibold text-green-600">Confirmed (Demo)</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-lg">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Student Details</h2>
            <div className="space-y-6">
              {bookingDetails.cartItems.map(({ entry, classItem }) => (
                <div key={entry.classId} className="rounded-3xl bg-light p-6">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-semibold">{classItem?.type ?? 'Class'}</p>
                      <h3 className="mt-2 text-xl font-semibold text-gray-900">
                        {classItem?.curriculum ?? 'Unknown class'}
                      </h3>
                      <p className="mt-1 text-gray-600">
                        {classItem ? `${classItem.location} · ${classItem.ageGroup} · ${classItem.semester}` : 'Class details unavailable'}
                      </p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                      {classItem?.price === 0 ? 'Free' : `₹${classItem?.price ?? 0}`}
                    </p>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <div className="rounded-3xl bg-white p-4">
                      <p className="text-sm text-gray-500">Student Name</p>
                      <p className="mt-2 font-semibold text-gray-900">{entry.childName}</p>
                      <p className="mt-1 text-sm text-gray-600">Date of Birth: {entry.childDob}</p>
                    </div>
                    <div className="rounded-3xl bg-white p-4">
                      <p className="text-sm text-gray-500">Class Details</p>
                      <p className="mt-2 font-semibold text-gray-900">{classItem?.instructor ?? 'Unknown'}</p>
                      <p className="mt-1 text-sm text-gray-600">{classItem?.dateTime ?? 'Schedule TBA'}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-white p-8 shadow-lg text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">What&apos;s Next?</h2>
            <p className="text-gray-600 mb-6">
              You will receive a confirmation email with all the details. Our team will contact you shortly to confirm the class schedule.
            </p>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center">
              <Link href="/trial" className="btn-primary">
                Book More Classes
              </Link>
              <Link href="/" className="btn-outline">
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}