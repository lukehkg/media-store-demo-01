'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

export default function Home() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    // Detect if we're on admin subdomain or tenant subdomain
    const hostname = window.location.hostname;
    
    if (hostname.startsWith('admin.') || hostname === 'admin.localhost') {
      if (user && user.is_admin) {
        router.push('/admin');
      } else {
        router.push('/admin/login');
      }
    } else {
      // Client/tenant subdomain
      if (user) {
        router.push('/client');
      } else {
        router.push('/client/login');
      }
    }
  }, [router, user]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}
