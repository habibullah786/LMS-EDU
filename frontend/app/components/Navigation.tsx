'use client';

import Link from 'next/link';
import { useAuth } from '@/app/context/AuthContext';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

export default function Navigation() {
  const { isAuthenticated, user, logout, openLoginModal } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const pathname = usePathname();

  // Admin and parent dashboards have their own internal header/nav.
  if (pathname?.startsWith('/admin') || pathname?.startsWith('/parent')) {
    return null;
  }

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
          <Link href="/trial" className="text-gray-700 hover:text-primary transition">Trial</Link>
          <a href="#features" className="text-gray-700 hover:text-primary transition">Features</a>
          <a href="#courses" className="text-gray-700 hover:text-primary transition">Courses</a>
          <a href="#contact" className="text-gray-700 hover:text-primary transition">Contact</a>
        </div>

        {/* Auth Buttons */}
        <div className="hidden md:block relative">
          {isAuthenticated ? (
            <>
              <button
                type="button"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen(open => !open)}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-primary/40 hover:text-primary"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{(user?.name ?? 'U').charAt(0).toUpperCase()}</span>
                <span>{user?.name?.split(' ')[0] ?? 'Account'}</span>
                <svg className={`h-4 w-4 transition-transform ${accountMenuOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {accountMenuOpen && <div className="absolute right-0 mt-2 w-52 overflow-hidden rounded-xl border border-gray-100 bg-white py-1 shadow-xl">
                <div className="border-b border-gray-100 px-4 py-3"><p className="truncate text-sm font-semibold text-gray-900">{user?.name}</p><p className="truncate text-xs text-gray-500">{user?.email}</p></div>
                <Link href={user?.role === 'admin' ? '/admin/dashboard' : '/parent/dashboard'} onClick={() => setAccountMenuOpen(false)} className="block px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-primary">Dashboard</Link>
                <button onClick={() => { setAccountMenuOpen(false); logout(); }} className="block w-full px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50">Logout</button>
              </div>}
            </>
          ) : (
            <>
              <button onClick={openLoginModal} className="text-primary font-semibold hover:text-blue-700 transition">
                Login
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
            <Link href="/trial" className="text-gray-700 hover:text-primary transition" onClick={() => setMobileMenuOpen(false)}>Trial</Link>
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
              </>
            )}
            {isAuthenticated && (
              <>
                <Link href={user?.role === 'admin' ? '/admin/dashboard' : '/parent/dashboard'} className="btn-primary text-center" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
                <button onClick={() => { setMobileMenuOpen(false); logout(); }} className="text-gray-700 font-medium text-left">Logout</button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
