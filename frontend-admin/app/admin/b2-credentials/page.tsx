'use client';

import { useState } from 'react';
import { adminAPI } from '@/lib/api';
import { useQuery, useMutation } from 'react-query';
import { format } from 'date-fns';

interface B2Credential {
  id: number;
  tenant_id: number | null;
  key_id: string;
  bucket_name: string | null;
  endpoint: string | null;
  is_active: boolean;
  created_at: string;
}

interface ConnectionStatus {
  status: 'connected' | 'partial' | 'error' | 'testing' | 'unknown';
  message: string;
  bucket?: string;
  endpoint?: string;
  bucket_accessible?: boolean;
  list_accessible?: boolean;
  response_time_ms?: number;
  object_count?: number;
}

export default function B2CredentialsPage() {
  const [defaultStatus, setDefaultStatus] = useState<ConnectionStatus>({
    status: 'unknown',
    message: 'Not tested'
  });
  const [testingDefault, setTestingDefault] = useState(false);
  const [testingCreds, setTestingCreds] = useState<Record<number, boolean>>({});
  const [credStatuses, setCredStatuses] = useState<Record<number, ConnectionStatus>>({});

  const { data: credentials, isLoading, refetch } = useQuery('b2Credentials', adminAPI.listB2Credentials, {
    refetchOnWindowFocus: true,
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  const testDefaultMutation = useMutation(adminAPI.testB2Connection, {
    onSuccess: (data) => {
      setDefaultStatus(data);
      setTestingDefault(false);
    },
    onError: (error: any) => {
      setDefaultStatus({
        status: 'error',
        message: error.response?.data?.message || 'Connection test failed'
      });
      setTestingDefault(false);
    }
  });

  const testCredentialMutation = useMutation(
    (credentialId: number) => adminAPI.testB2Credential(credentialId),
    {
      onSuccess: (data, credentialId) => {
        setCredStatuses(prev => ({ ...prev, [credentialId]: data }));
        setTestingCreds(prev => ({ ...prev, [credentialId]: false }));
      },
      onError: (error: any, credentialId) => {
        setCredStatuses(prev => ({
          ...prev,
          [credentialId]: {
            status: 'error',
            message: error.response?.data?.message || 'Connection test failed'
          }
        }));
        setTestingCreds(prev => ({ ...prev, [credentialId]: false }));
      }
    }
  );

  const handleTestDefault = () => {
    setTestingDefault(true);
    setDefaultStatus({ status: 'testing', message: 'Testing connection...' });
    testDefaultMutation.mutate();
  };

  const handleTestCredential = (credentialId: number) => {
    setTestingCreds(prev => ({ ...prev, [credentialId]: true }));
    setCredStatuses(prev => ({
      ...prev,
      [credentialId]: { status: 'testing', message: 'Testing connection...' }
    }));
    testCredentialMutation.mutate(credentialId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'testing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'connected':
        return (
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'testing':
        return (
          <svg className="w-5 h-5 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">B2 Credentials</h1>
        <p className="mt-2 text-sm text-gray-600">Manage and test Backblaze B2 storage credentials</p>
      </div>

      {/* Default Connection Status */}
      <div className="bg-white rounded-lg shadow mb-8">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Default B2 Connection</h2>
            <p className="text-sm text-gray-500 mt-1">System-wide default credentials</p>
          </div>
          <button
            onClick={handleTestDefault}
            disabled={testingDefault}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {testingDefault ? (
              <>
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Testing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Test Connection</span>
              </>
            )}
          </button>
        </div>
        <div className="px-6 py-4">
          <div className={`border rounded-lg p-4 ${getStatusColor(defaultStatus.status)}`}>
            <div className="flex items-center space-x-3">
              {getStatusIcon(defaultStatus.status)}
              <div className="flex-1">
                <div className="font-medium">Status: {defaultStatus.status.toUpperCase()}</div>
                <div className="text-sm mt-1">{defaultStatus.message}</div>
                {defaultStatus.response_time_ms && (
                  <div className="text-xs mt-1 opacity-75">
                    Response time: {defaultStatus.response_time_ms}ms
                    {defaultStatus.object_count !== undefined && ` • Objects: ${defaultStatus.object_count}`}
                  </div>
                )}
                {defaultStatus.bucket && (
                  <div className="text-xs mt-1 opacity-75">
                    Bucket: {defaultStatus.bucket} • Endpoint: {defaultStatus.endpoint}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Credentials Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Managed Credentials</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Key ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bucket</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Connection</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {credentials && credentials.length > 0 ? (
                credentials.map((cred: any) => {
                  const credStatus = credStatuses[cred.id] || { status: 'unknown', message: 'Not tested' };
                  const isTesting = testingCreds[cred.id] || false;
                  
                  return (
                    <tr key={cred.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{cred.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cred.tenant_id || 'Default'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                        {cred.key_id.substring(0, 20)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{cred.bucket_name}</div>
                        {cred.endpoint && (
                          <div className="text-xs text-gray-400 mt-1">{cred.endpoint}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            cred.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {cred.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center space-x-2 px-2 py-1 rounded text-xs ${getStatusColor(credStatus.status)}`}>
                          {getStatusIcon(credStatus.status)}
                          <span>{credStatus.status.toUpperCase()}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {cred.created_at ? format(new Date(cred.created_at), 'MMM dd, yyyy') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => handleTestCredential(cred.id)}
                          disabled={isTesting}
                          className="text-primary-600 hover:text-primary-900 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isTesting ? 'Testing...' : 'Test'}
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-sm text-gray-500">
                    No credentials found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Connection Testing</h3>
        <p className="text-sm text-blue-700">
          Use the "Test Connection" button to verify B2 credentials are working correctly. The test will:
        </p>
        <ul className="text-sm text-blue-700 mt-2 list-disc list-inside space-y-1">
          <li>Verify bucket exists and is accessible</li>
          <li>Test listing objects in the bucket</li>
          <li>Measure response time</li>
          <li>Display connection status (Connected/Partial/Error)</li>
        </ul>
      </div>
    </div>
  );
}
