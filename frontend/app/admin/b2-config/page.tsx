'use client';

import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import { useQuery, useMutation } from 'react-query';
import { format } from 'date-fns';

interface B2Config {
  key_id: string;
  bucket: string;
  endpoint: string;
  key?: string; // Application key (optional, for updates)
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

export default function B2ConfigPage() {
  const [formData, setFormData] = useState<B2Config>({
    key_id: '',
    bucket: '',
    endpoint: ''
  });
  const [applicationKey, setApplicationKey] = useState(''); // Separate field for security
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'unknown',
    message: 'Not tested'
  });
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: config, isLoading, refetch } = useQuery('b2Config', adminAPI.getB2Config, {
    refetchOnWindowFocus: true,
    onSuccess: (data) => {
      setFormData({
        key_id: data.key_id || '',
        bucket: data.bucket || '',
        endpoint: data.endpoint || ''
      });
      // Don't set application key from API (security)
      setApplicationKey('');
    }
  });

  const updateMutation = useMutation(adminAPI.updateB2Config, {
    onSuccess: () => {
      setSaving(false);
      alert('B2 configuration updated successfully!');
      refetch();
      // Auto-test after update
      handleTestConnection();
    },
    onError: (error: any) => {
      setSaving(false);
      alert(`Failed to update: ${error?.response?.data?.detail || error?.message || 'Unknown error'}`);
    }
  });

  const testMutation = useMutation(adminAPI.testB2Connection, {
    onSuccess: (data) => {
      setConnectionStatus(data);
      setTesting(false);
    },
    onError: (error: any) => {
      setConnectionStatus({
        status: 'error',
        message: error?.response?.data?.detail || error?.message || 'Connection test failed'
      });
      setTesting(false);
    }
  });

  useEffect(() => {
    if (config) {
      handleTestConnection();
    }
  }, []);

  const handleTestConnection = () => {
    setTesting(true);
    setConnectionStatus({ status: 'testing', message: 'Testing connection...' });
    testMutation.mutate();
  };

  const handleSave = () => {
    if (!formData.key_id || !formData.bucket || !formData.endpoint) {
      alert('Please fill in all fields');
      return;
    }
    setSaving(true);
    const updateData: {
      key_id: string;
      key: string;
      bucket_name: string;
      endpoint?: string;
    } = {
      key_id: formData.key_id,
      key: applicationKey || '',
      bucket_name: formData.bucket
    };
    if (formData.endpoint) {
      updateData.endpoint = formData.endpoint;
    }
    updateMutation.mutate(updateData);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'partial':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'error':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'testing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Backblaze B2 Configuration</h1>
        
        {/* Connection Status */}
        <div className={`mb-6 p-4 rounded-lg border-2 ${getStatusColor(connectionStatus.status)}`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className={`font-semibold mb-1 ${connectionStatus.status === 'connected' ? 'text-green-900' : connectionStatus.status === 'error' ? 'text-red-900' : connectionStatus.status === 'testing' ? 'text-blue-900' : 'text-gray-900'}`}>Connection Status</h3>
              <p className={`text-sm ${connectionStatus.status === 'connected' ? 'text-green-800' : connectionStatus.status === 'error' ? 'text-red-800' : connectionStatus.status === 'testing' ? 'text-blue-800' : 'text-gray-800'}`}>{connectionStatus.message}</p>
              {connectionStatus.response_time_ms && (
                <p className={`text-xs mt-1 ${connectionStatus.status === 'connected' ? 'text-green-700' : connectionStatus.status === 'error' ? 'text-red-700' : connectionStatus.status === 'testing' ? 'text-blue-700' : 'text-gray-700'}`}>Response time: {connectionStatus.response_time_ms}ms</p>
              )}
              {connectionStatus.object_count !== undefined && (
                <p className={`text-xs mt-1 ${connectionStatus.status === 'connected' ? 'text-green-700' : connectionStatus.status === 'error' ? 'text-red-700' : connectionStatus.status === 'testing' ? 'text-blue-700' : 'text-gray-700'}`}>Objects in bucket: {connectionStatus.object_count}</p>
              )}
            </div>
            <button
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {testing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
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
        </div>

        {/* Configuration Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Application Key ID
            </label>
            <input
              type="text"
              value={formData.key_id}
              onChange={(e) => setFormData({ ...formData, key_id: e.target.value })}
              placeholder="003efd17c411f3d0000000001"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">Your Backblaze B2 Application Key ID</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Application Key
            </label>
            <input
              type="password"
              value={applicationKey}
              onChange={(e) => setApplicationKey(e.target.value)}
              placeholder="K001xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">Your Backblaze B2 Application Key (leave blank to keep current)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bucket Name
            </label>
            <input
              type="text"
              value={formData.bucket}
              onChange={(e) => setFormData({ ...formData, bucket: e.target.value })}
              placeholder="my-bucket-name"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">Your Backblaze B2 bucket name</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Endpoint URL
            </label>
            <input
              type="text"
              value={formData.endpoint}
              onChange={(e) => setFormData({ ...formData, endpoint: e.target.value })}
              placeholder="https://s3.eu-central-003.backblazeb2.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            />
            <p className="text-xs text-gray-500 mt-1">S3-compatible endpoint URL for your B2 bucket</p>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={() => refetch()}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Reset
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Save Configuration</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

