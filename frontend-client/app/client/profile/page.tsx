'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { authAPI, tenantAPI } from '@/lib/api';
import { useQuery, useMutation } from 'react-query';
import { format } from 'date-fns';

export default function ClientProfilePage() {
  const router = useRouter();
  const { user, clearAuth } = useAuthStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  const { data: storageInfo } = useQuery('storageInfo', tenantAPI.getStorageInfo);
  const { data: tenantInfo } = useQuery('tenantInfo', tenantAPI.getTenantInfo);
  const { data: usageLogs } = useQuery('usageLogs', () => tenantAPI.getUsageLogs(0, 20));

  if (!user) {
    router.push('/client/login');
    return null;
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError('New password must be different from current password');
      return;
    }

    setChangingPassword(true);
    try {
      await authAPI.changePassword(currentPassword, newPassword);
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordError(error?.response?.data?.detail || error?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/client')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">Profile Settings</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Account Information */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 text-sm text-gray-900">{user.email}</div>
            </div>
            {tenantInfo && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tenant Name</label>
                  <div className="mt-1 text-sm text-gray-900">{tenantInfo.name}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Subdomain</label>
                  <div className="mt-1 text-sm text-gray-900">{tenantInfo.subdomain}</div>
                </div>
              </>
            )}
            {storageInfo && (
              <div>
                <label className="block text-sm font-medium text-gray-700">Storage Usage</label>
                <div className="mt-1 text-sm text-gray-900">
                  {storageInfo.storage_used_mb.toFixed(2)} MB / {storageInfo.storage_limit_mb} MB
                  {' '}({storageInfo.storage_percentage.toFixed(1)}%)
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      storageInfo.storage_percentage > 90 ? 'bg-red-500' :
                      storageInfo.storage_percentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(storageInfo.storage_percentage, 100)}%` }}
                  ></div>
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {(storageInfo.storage_limit_mb - storageInfo.storage_used_mb).toFixed(2)} MB remaining
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700">Account Created</label>
              <div className="mt-1 text-sm text-gray-900">
                {(user as any).created_at ? format(new Date((user as any).created_at), 'MMMM dd, yyyy') : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* Usage Logs */}
        {usageLogs && usageLogs.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="space-y-2">
              {usageLogs.slice(0, 10).map((log: any) => (
                <div key={log.id} className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      log.log_type === 'upload' ? 'bg-green-500' :
                      log.log_type === 'delete' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}></div>
                    <span className="text-sm text-gray-700 capitalize">{log.log_type}</span>
                  </div>
                  <div className="text-sm text-gray-500">
                    {log.bytes_transferred ? `${(log.bytes_transferred / (1024 * 1024)).toFixed(2)} MB` : '-'}
                    {' • '}
                    {log.created_at ? format(new Date(log.created_at), 'MMM dd, HH:mm') : '-'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Change Password */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Current Password
              </label>
              <input
                type="password"
                id="currentPassword"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
            </div>
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                minLength={6}
              />
            </div>
            {passwordError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{passwordError}</p>
              </div>
            )}
            {passwordSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-700">{passwordSuccess}</p>
              </div>
            )}
            <button
              type="submit"
              disabled={changingPassword}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {changingPassword ? 'Changing Password...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

