'use client';

import './globals.css';
import { usePathname } from 'next/navigation';
import { AuthProvider } from './context/AuthContext';
import Navigation from '@/app/components/Navigation';
import LoginModal from '@/app/components/LoginModal';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideNav = pathname?.startsWith('/admin') || pathname?.startsWith('/parent');

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta
          name="description"
          content="LMS-EDU: Learn coding and robotics with our expert instructors for students aged 7-17"
        />
        <title>LMS-EDU | Learn Coding & Robotics</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          {!hideNav && <Navigation />}
          <LoginModal />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
