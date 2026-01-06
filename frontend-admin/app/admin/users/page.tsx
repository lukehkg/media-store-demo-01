'use client';

import { adminAPI } from '@/lib/api';
import { useQuery } from 'react-query';
import { format } from 'date-fns';

export default function UsersManagementPage() {
  const { data: systemStats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery('systemStats', adminAPI.getSystemStats, {
    retry: 3,
    retryDelay: 1000,
    onError: (error: any) => {
      console.error('System Stats fetch error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }
  });
  const { data: users, isLoading: usersLoading, error: usersError, refetch: refetchUsers } = useQuery('allUsers', () => adminAPI.listUsers(0, 1000), {
    retry: 3,
    retryDelay: 1000,
    onSuccess: (data) => {
      console.log('Users loaded:', data);
      console.log('User count:', data?.length || 0);
    },
    onError: (error: any) => {
      console.error('Users fetch error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      });
    }
  });

  const isLoading = statsLoading || usersLoading;

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  if (statsError || usersError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-red-900">Error Loading User Data</h2>
          </div>
          <p className="text-sm text-red-700 mb-2">
            {statsError ? `Stats Error: ${(statsError as any)?.response?.data?.detail || (statsError as any)?.response?.data?.message || (statsError as any)?.message || 'Failed to load statistics'}` : ''}
          </p>
          <p className="text-sm text-red-700 mb-4">
            {usersError ? `Users Error: ${(usersError as any)?.response?.data?.detail || (usersError as any)?.response?.data?.message || (usersError as any)?.message || 'Failed to load users'}` : ''}
          </p>
          <div className="text-xs text-red-600 mb-4 p-3 bg-red-100 rounded">
            <strong>Debug Info:</strong><br/>
            Stats Status: {statsError ? (statsError as any)?.response?.status || 'N/A' : 'OK'}<br/>
            Users Status: {usersError ? (usersError as any)?.response?.status || 'N/A' : 'OK'}<br/>
            Check browser console (F12) for more details.
          </div>
          <button
            onClick={() => { refetchStats(); refetchUsers(); }}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="mt-2 text-sm text-gray-600">View and manage all registered users</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-sm font-medium opacity-90 mb-2">Total Users</h3>
          <p className="text-4xl font-bold">{systemStats?.total_users || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-sm font-medium opacity-90 mb-2">Registered Clients</h3>
          <p className="text-4xl font-bold">{systemStats?.registered_clients || 0}</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-sm font-medium opacity-90 mb-2">Total Storage</h3>
          <p className="text-4xl font-bold">{systemStats?.total_storage_used_mb || 0} MB</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white">
          <h3 className="text-sm font-medium opacity-90 mb-2">Total Photos</h3>
          <p className="text-4xl font-bold">{systemStats?.total_photos || 0}</p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Registered Users</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Registration Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Password Hash
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tenant ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users && Array.isArray(users) && users.length > 0 ? (
                users.map((user: any) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.is_admin ? (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-semibold">Admin</span>
                      ) : user.is_tenant_admin ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">Tenant Admin</span>
                      ) : (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-semibold">User</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy HH:mm:ss') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono text-xs">
                      {user.hashed_password || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.tenant_id || 'None (Admin)'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        Active
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                    No users found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

