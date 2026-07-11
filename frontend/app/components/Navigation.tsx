'use client';

import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { useState } from 'react';

export default function Navigation() {
  const { isAuthenticated, user, logout, openLoginModal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return null;

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50 print:hidden">
      <div className="section-container py-4 flex justify-between items-center">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">ER</span>
          </div>
          <span className="font-bold text-xl text-gray-900 hidden sm:inline">Exceed Robotics</span>
        </Link>

        {/* Desktop Menu */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-gray-700 hover:text-primary transition">Features</a>
          <a href="#courses" className="text-gray-700 hover:text-primary transition">Courses</a>
          <a href="#contact" className="text-gray-700 hover:text-primary transition">Contact</a>
        </div>

        {/* Auth Buttons */}
        <div className="flex items-center gap-4">
          {isAuthenticated && user?.role === 'admin' ? (
            <>
              <span className="text-gray-700 text-sm">Admin: {user?.name?.split(' ')[0]}</span>
              <Link href="/admin/dashboard" className="btn-secondary text-sm">Admin Dashboard</Link>
              <button onClick={logout} className="px-4 py-2 text-gray-700 hover:text-primary transition font-medium">
                Logout
              </button>
            </>
          ) : isAuthenticated ? (
            <>
              <span className="text-gray-700 text-sm hidden sm:inline">Hi, {user?.name?.split(' ')[0]}</span>
              <Link href="/parent/dashboard" className="btn-primary text-sm">Dashboard</Link>
              <button onClick={logout} className="px-4 py-2 text-gray-700 hover:text-primary transition font-medium">
                Logout
              </button>
            </>
          ) : (
            <>
              <button onClick={openLoginModal} className="text-primary font-semibold hover:text-blue-700 transition">
                Login
              </button>
              <button onClick={openLoginModal} className="btn-primary text-sm">
                Get Started
              </button>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button className="md:hidden text-primary" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="section-container py-4 flex flex-col gap-4">
            <a href="#features" className="text-gray-700 hover:text-primary transition" onClick={() => setMobileMenuOpen(false)}>Features</a>
            <a href="#courses" className="text-gray-700 hover:text-primary transition" onClick={() => setMobileMenuOpen(false)}>Courses</a>
            <a href="#contact" className="text-gray-700 hover:text-primary transition" onClick={() => setMobileMenuOpen(false)}>Contact</a>
            {!isAuthenticated && (
              <>
                <button
                  onClick={() => { setMobileMenuOpen(false); openLoginModal(); }}
                  className="text-primary font-semibold text-left"
                >
                  Login
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); openLoginModal(); }}
                  className="btn-primary text-center"
                >
                  Get Started
                </button>
              </>
            )}
            {isAuthenticated && (
              <>
                <Link href="/parent/dashboard" className="btn-primary text-center" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                <button onClick={() => { setMobileMenuOpen(false); logout(); }} className="text-gray-700 font-medium text-left">Logout</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
