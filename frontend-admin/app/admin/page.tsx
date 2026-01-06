'use client';

import { useEffect, useState } from 'react';
import { adminAPI } from '@/lib/api';
import { useQuery } from 'react-query';
import { format } from 'date-fns';

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery('systemStats', adminAPI.getSystemStats, {
    retry: 3,
    retryDelay: 1000,
    refetchInterval: 30000, // Refresh every 30 seconds
    refetchOnWindowFocus: true,
  });
  const { data: health, isLoading: healthLoading, refetch: refetchHealth, error: healthError } = useQuery('systemHealth', adminAPI.getSystemHealth, {
    refetchInterval: 30000, // Refresh every 30 seconds
    retry: 3,
    retryDelay: 1000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'unhealthy':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (statsLoading || healthLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="h-8 bg-gray-200 rounded w-1/3"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show error if API calls failed
  if (statsError || healthError) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-red-900">Error Loading Dashboard Data</h2>
          </div>
          <p className="text-sm text-red-700 mb-4">
            {statsError ? (
              <div>
                <strong>Stats Error:</strong> {(statsError as any)?.message || (statsError as any)?.response?.data?.detail || 'Failed to load system statistics'}
                <br />
                <span className="text-xs opacity-75">
                  Code: {(statsError as any)?.code || 'N/A'} | 
                  URL: {(statsError as any)?.config?.url || 'N/A'}
                </span>
              </div>
            ) : ''}
            {healthError ? (
              <div>
                <strong>Health Error:</strong> {(healthError as any)?.message || (healthError as any)?.response?.data?.detail || 'Failed to load system health'}
                <br />
                <span className="text-xs opacity-75">
                  Code: {(healthError as any)?.code || 'N/A'} | 
                  URL: {(healthError as any)?.config?.url || 'N/A'}
                </span>
              </div>
            ) : ''}
          </p>
          <div className="flex space-x-3">
            <button
              onClick={() => { refetchStats(); refetchHealth(); }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
            <p className="text-xs text-red-600 self-center">
              Make sure the backend service is running on http://localhost:8000
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
              System Dashboard
            </h1>
            <p className="mt-2 text-sm text-gray-600">Monitor and manage all tenants and system resources</p>
          </div>
          <button
            onClick={() => refetchHealth()}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors shadow-sm flex items-center space-x-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Service Health Status */}
      {health && Object.keys(health).length > 0 && (
        <div className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {Object.entries(health).map(([service, status]: [string, any]) => (
            <div
              key={service}
              className={`bg-white rounded-xl shadow-lg border-2 ${getStatusColor(status.status)} p-6 transition-all hover:shadow-xl`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(status.status)}
                  <h3 className="text-lg font-semibold capitalize">{service.replace('_', ' ')}</h3>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  status.status === 'healthy' ? 'bg-green-200 text-green-800' :
                  status.status === 'unhealthy' ? 'bg-red-200 text-red-800' :
                  'bg-yellow-200 text-yellow-800'
                }`}>
                  {status.status}
                </span>
              </div>
              <p className="text-sm mb-2">{status.message}</p>
              {status.details && (
                <div className="mt-3 pt-3 border-t border-current border-opacity-20 space-y-1 text-xs">
                  {status.details.bucket && (
                    <div className="flex justify-between">
                      <span className="opacity-75">Bucket:</span>
                      <span className="font-medium">{status.details.bucket}</span>
                    </div>
                  )}
                  {status.details.object_count !== undefined && (
                    <div className="flex justify-between">
                      <span className="opacity-75">Objects:</span>
                      <span className="font-medium">{status.details.object_count.toLocaleString()}</span>
                    </div>
                  )}
                  {status.details.response_time_ms !== undefined && (
                    <div className="flex justify-between">
                      <span className="opacity-75">Response:</span>
                      <span className="font-medium">{status.details.response_time_ms}ms</span>
                    </div>
                  )}
                </div>
              )}
              <p className="text-xs opacity-60 mt-2">
                {format(new Date(status.timestamp), 'MMM dd, yyyy HH:mm:ss')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <h3 className="text-sm font-medium opacity-90 mb-2">Total Tenants</h3>
          <p className="text-4xl font-bold">{stats?.total_tenants || 0}</p>
          <p className="text-sm opacity-75 mt-2">{stats?.active_tenants || 0} active</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <h3 className="text-sm font-medium opacity-90 mb-2">B2 Bucket Storage</h3>
          <p className="text-4xl font-bold">
            {stats?.b2_bucket_storage_mb !== undefined && stats.b2_bucket_storage_mb > 0 
              ? `${stats.b2_bucket_storage_mb.toFixed(2)} MB` 
              : stats?.b2_bucket_storage_mb === 0 
                ? '0 MB' 
                : (stats?.total_storage_used_mb || 0) + ' MB'}
          </p>
          <p className="text-sm opacity-75 mt-2">
            {stats?.b2_bucket_objects !== undefined 
              ? `${stats.b2_bucket_objects.toLocaleString()} objects` 
              : stats?.b2_bucket_storage_mb !== undefined 
                ? 'Calculating...' 
                : 'Across all tenants'}
          </p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <h3 className="text-sm font-medium opacity-90 mb-2">Total Photos</h3>
          <p className="text-4xl font-bold">{stats?.total_photos || 0}</p>
          <p className="text-sm opacity-75 mt-2">Uploaded files</p>
        </div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
          <h3 className="text-sm font-medium opacity-90 mb-2">Active Tenants</h3>
          <p className="text-4xl font-bold">{stats?.active_tenants || 0}</p>
          <p className="text-sm opacity-75 mt-2">Currently active</p>
        </div>
      </div>

      {/* Registered Clients Card */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <h3 className="text-sm font-medium opacity-90 mb-2">Registered Clients</h3>
            <p className="text-4xl font-bold">{stats?.registered_clients || 0}</p>
            <p className="text-sm opacity-75 mt-2">Total client accounts</p>
          </div>
          <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg p-6 text-white transform hover:scale-105 transition-transform">
            <h3 className="text-sm font-medium opacity-90 mb-2">Total Users</h3>
            <p className="text-4xl font-bold">{stats?.total_users || 0}</p>
            <p className="text-sm opacity-75 mt-2">All user accounts</p>
          </div>
        </div>
      )}

      {/* Tenant Overview Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-xl font-semibold text-gray-900">Tenant Overview</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subdomain
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Storage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Photos
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stats?.tenants?.length > 0 ? (
                stats.tenants.map((tenant: any) => (
                  <tr key={tenant.tenant_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {tenant.subdomain}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <span>{tenant.storage_used_mb} / {tenant.storage_limit_mb} MB</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            tenant.storage_percentage > 90
                              ? 'bg-red-500'
                              : tenant.storage_percentage > 70
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(tenant.storage_percentage, 100)}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant.photo_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {tenant.expires_at ? format(new Date(tenant.expires_at), 'MMM dd, yyyy') : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          tenant.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tenant.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                    No tenants found
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
