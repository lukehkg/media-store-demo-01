'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import Link from 'next/link';

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();

  useEffect(() => {
    // Redirect to login if not authenticated (but allow login page)
    if (typeof window === 'undefined') return;
    
    const path = window.location.pathname;
    // Skip redirect if already on login page
    if (path.includes('/login')) {
      return;
    }
    
    // Only redirect if no user and not on login page
    // Check current path again to avoid redirect loops
    if (!user && !window.location.pathname.includes('/login')) {
      router.push('/client/login');
    }
  }, [user, router]);

  // Don't show layout on login page
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  if (path.includes('/login')) {
    return <>{children}</>;
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link href="/client" className="flex items-center">
                <h1 className="text-xl font-bold text-primary-600">Photo Portal</h1>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/client/profile"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Profile</span>
              </Link>
              <span className="text-sm text-gray-600 font-medium">{user.email}</span>
              <button
                onClick={() => {
                  clearAuth();
                  // Force full page reload to clear all state
                  window.location.href = '/client/login';
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-red-500 to-red-600 rounded-lg hover:from-red-600 hover:to-red-700 transition-all shadow-md hover:shadow-lg transform hover:scale-105 flex items-center space-x-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}

