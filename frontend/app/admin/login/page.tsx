'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';

interface VersionInfo {
  api_version: string;
  frontend_version: string;
  platform: string;
  s3_compatible: boolean;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const { setAuth, user, token } = useAuthStore();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [version, setVersion] = useState<VersionInfo | null>(null);
  
  // Fetch version info
  useEffect(() => {
    fetch('http://localhost:8000/api/version')
      .then(res => res.json())
      .then(data => setVersion(data))
      .catch(() => setVersion(null));
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user && user.is_admin && token) {
      router.push('/admin');
    }
  }, [user, token, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError('Please enter both email and password');
      setLoading(false);
      return;
    }

    try {
      const loginParams = new URLSearchParams();
      loginParams.append('username', email);
      loginParams.append('password', password);
      
      const loginResponse = await fetch('http://localhost:8000/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: loginParams.toString()
      });
      
      if (!loginResponse.ok) {
        const errorText = await loginResponse.text();
        throw new Error(`Login failed: ${errorText}`);
      }
      
      const response = await loginResponse.json();
      
      if (!response || !response.access_token) {
        throw new Error('Invalid response from server');
      }
      
      localStorage.setItem('access_token', response.access_token);
      
      // Get user info
      const meResponse = await fetch('http://localhost:8000/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${response.access_token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!meResponse.ok) {
        localStorage.removeItem('access_token');
        throw new Error('Failed to verify user');
      }
      
      const meData = await meResponse.json();
      
      if (!meData.is_admin) {
        localStorage.removeItem('access_token');
        throw new Error('Access denied. Admin privileges required.');
      }
      
      setAuth(meData, response.access_token);
      router.push('/admin');
      
    } catch (error: any) {
      setError(error.message || 'Login failed. Please check your credentials.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          {/* Logo/Brand */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl mb-4 shadow-lg">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Portal</h1>
            <p className="text-gray-600">Sign in to manage your cloud storage platform</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-sm text-red-700">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Enter your password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="text-center text-xs text-gray-400 space-y-1">
              <p className="font-medium text-gray-500">Cloud Storage Management Platform</p>
              {version && (
                <div className="flex items-center justify-center space-x-3 mt-2">
                  <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded text-xs font-mono">
                    API v{version.api_version}
                  </span>
                  <span className="px-2 py-1 bg-green-50 text-green-600 rounded text-xs font-mono">
                    Frontend v{version.frontend_version}
                  </span>
                  {version.s3_compatible && (
                    <span className="px-2 py-1 bg-purple-50 text-purple-600 rounded text-xs">
                      S3 Compatible
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
