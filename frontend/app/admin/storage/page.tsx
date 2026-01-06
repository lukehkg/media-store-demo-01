'use client';

import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';

interface B2Config {
  key_id: string;
  key: string;
  bucket_name: string;
  endpoint?: string;
}

export default function StorageConfigPage() {
  const [config, setConfig] = useState<B2Config>({
    key_id: '',
    key: '',
    bucket_name: '',
    endpoint: ''
  });
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const queryClient = useQueryClient();

  const { data: b2Config, isLoading: configLoading, error: configError, refetch: refetchConfig } = useQuery(
    'b2Config', 
    adminAPI.getB2Config,
    {
      retry: 2,
      onError: (error: any) => {
        console.error('B2 Config fetch error:', error);
        alert(`Failed to load B2 config: ${error.response?.data?.detail || error.message || 'Unknown error'}`);
      }
    }
  );
  const { data: systemStats, isLoading: statsLoading, error: statsError } = useQuery(
    'systemStats', 
    adminAPI.getSystemStats,
    {
      retry: 2,
      onError: (error: any) => {
        console.error('System Stats fetch error:', error);
      }
    }
  );

  useEffect(() => {
    if (b2Config) {
      console.log('B2 Config loaded:', { ...b2Config, key: '***hidden***' });
      setConfig({
        key_id: b2Config.key_id || '',
        key: '', // Never show existing key for security
        bucket_name: b2Config.bucket || '',
        endpoint: b2Config.endpoint || ''
      });
    }
  }, [b2Config]);

  const testMutation = useMutation(adminAPI.testB2Connection, {
    onSuccess: (data) => {
      setConnectionStatus(data);
      setTesting(false);
    },
    onError: (error: any) => {
      setConnectionStatus({
        status: 'error',
        message: error.response?.data?.message || 'Connection test failed'
      });
      setTesting(false);
    }
  });

  const updateMutation = useMutation(adminAPI.updateB2Config, {
    onSuccess: (data) => {
      console.log('B2 config saved successfully:', data);
      setSaving(false);
      // Refresh config to show updated endpoint
      refetchConfig();
      // Invalidate B2 credentials query to refresh the B2 Keys page
      queryClient.invalidateQueries('b2Credentials');
      // Clear the key field for security
      setConfig(prev => ({ ...prev, key: '' }));
      alert('B2 configuration updated successfully!');
    },
    onError: (error: any) => {
      setSaving(false);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || 'Failed to update configuration';
      console.error('B2 config save error:', error);
      console.error('Error response:', error.response?.data);
      console.error('Error status:', error.response?.status);
      alert(`Failed to update configuration: ${errorMessage}`);
    }
  });

  const handleTest = () => {
    setTesting(true);
    testMutation.mutate();
  };

  const handleSave = () => {
    if (!config.key_id || !config.key || !config.bucket_name) {
      alert('Please fill in all required fields (Application Key ID, Application Key, and Bucket Name)');
      return;
    }
    
    // Trim whitespace
    const trimmedConfig = {
      key_id: config.key_id.trim(),
      key: config.key.trim(),
      bucket_name: config.bucket_name.trim(),
      endpoint: config.endpoint?.trim() || ''  // Always send endpoint, even if empty
    };
    
    if (!trimmedConfig.key_id || !trimmedConfig.key || !trimmedConfig.bucket_name) {
      alert('All required fields (Key ID, Key, and Bucket Name) must be filled');
      return;
    }
    
    setSaving(true);
    console.log('Saving B2 config:', { ...trimmedConfig, key: '***hidden***' });
    updateMutation.mutate(trimmedConfig);
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'connected':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'partial':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  // Show loading only if both are loading
  if (configLoading && statsLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  // Show errors but still allow page to render
  const hasErrors = configError || statsError;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">
          Backblaze B2 Storage Configuration
        </h1>
        <p className="mt-2 text-sm text-gray-600">Configure and monitor your Backblaze B2 storage settings</p>
      </div>

      {/* Show errors at top if any */}
      {hasErrors && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-2">
            <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <h3 className="text-sm font-semibold text-yellow-900">Warning: Some data could not be loaded</h3>
          </div>
          <div className="text-sm text-yellow-700 space-y-1">
            {configError && (
              <p>Config: {(configError as any)?.response?.data?.detail || (configError as any)?.message || 'Failed to load B2 configuration'}</p>
            )}
            {statsError && (
              <p>Stats: {(statsError as any)?.response?.data?.detail || (statsError as any)?.message || 'Failed to load statistics'}</p>
            )}
          </div>
          <button
            onClick={() => { refetchConfig(); }}
            className="mt-3 px-3 py-1 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors"
          >
            Retry Loading
          </button>
        </div>
      )}

      {/* Configuration Form */}
      <div className="bg-white rounded-xl shadow-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-xl font-semibold text-gray-900">Update B2 Configuration</h2>
          <p className="text-sm text-gray-500 mt-1">Enter your Backblaze B2 Application Key ID, Application Key, and Bucket Name</p>
        </div>
        <div className="px-6 py-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Key ID <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.key_id}
                onChange={(e) => setConfig({ ...config, key_id: e.target.value })}
                placeholder="Enter your B2 Application Key ID"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bucket Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={config.bucket_name}
                onChange={(e) => setConfig({ ...config, bucket_name: e.target.value })}
                placeholder="Enter your B2 Bucket Name"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Key <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={config.key}
                  onChange={(e) => setConfig({ ...config, key: e.target.value })}
                  placeholder="Enter your B2 Application Key"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-10 text-gray-900"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showKey ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.29 3.29m0 0a9.97 9.97 0 011.563-3.029M6.29 6.29L12 12m-5.71-5.71L3 3m9 9l3.29 3.29M12 12l3.29 3.29m0 0a9.97 9.97 0 001.563 3.029M15.71 15.71L12 12m3.71 3.71L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endpoint URL <span className="text-gray-500 text-xs">(optional)</span>
              </label>
              <input
                type="url"
                value={config.endpoint || ''}
                onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                placeholder="e.g., https://s3.us-west-000.backblazeb2.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm text-gray-900 bg-white"
              />
              <p className="mt-1 text-xs text-gray-500">B2 S3-compatible endpoint URL. Leave empty to use default from environment variables.</p>
            </div>
          </div>
          <div className="flex items-center space-x-4 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-md hover:shadow-lg flex items-center space-x-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
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

      {/* Connection Status */}
      <div className="bg-white rounded-xl shadow-lg mb-8">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Connection Status</h2>
            <p className="text-sm text-gray-500 mt-1">Test the connection to Backblaze B2 storage</p>
          </div>
          <button
            onClick={handleTest}
            disabled={testing}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
          >
            {testing ? (
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
          {connectionStatus ? (
            <div className={`border-2 rounded-lg p-4 ${getStatusColor(connectionStatus.status)}`}>
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-lg text-gray-900">Status: {connectionStatus.status?.toUpperCase() || 'UNKNOWN'}</div>
                {connectionStatus.response_time_ms && (
                  <div className="text-sm text-gray-700 font-medium">Response: {connectionStatus.response_time_ms}ms</div>
                )}
              </div>
              <div className="text-sm mt-2 text-gray-800">{connectionStatus.message}</div>
              {connectionStatus.bucket && (
                <div className="text-xs mt-2 text-gray-700 font-mono bg-white bg-opacity-50 px-2 py-1 rounded">
                  Bucket: {connectionStatus.bucket} • Endpoint: {connectionStatus.endpoint || 'N/A'}
                </div>
              )}
              {connectionStatus.object_count !== undefined && (
                <div className="text-xs mt-1 text-gray-700">
                  Objects in bucket: {connectionStatus.object_count.toLocaleString()}
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">Click "Test Connection" to check status</div>
          )}
        </div>
      </div>

      {/* Storage Statistics */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-white">
          <h2 className="text-xl font-semibold text-gray-900">Shared Backblaze B2 Storage</h2>
          <p className="text-sm text-gray-600 mt-1">Total storage shared across all clients from your B2 bucket</p>
        </div>
        <div className="px-6 py-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{systemStats?.total_storage_used_mb || 0} MB</div>
              <div className="text-sm text-gray-700 mt-1 font-medium">Total Storage Used</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-gray-900">{systemStats?.total_photos || 0}</div>
              <div className="text-sm text-gray-700 mt-1 font-medium">Total Files</div>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-gray-900">{systemStats?.active_tenants || 0}</div>
              <div className="text-sm text-gray-700 mt-1 font-medium">Active Tenants</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tenant Storage Management */}
      <div className="bg-white rounded-xl shadow-lg p-6 mt-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Tenant Storage Quotas</h2>
        <p className="text-sm text-gray-600 mb-6">Manage storage limits for each tenant</p>
        
        <TenantStorageManager />
      </div>
    </div>
  );
}

function TenantStorageManager() {
  const [editingTenant, setEditingTenant] = useState<number | null>(null);
  const [newLimit, setNewLimit] = useState<number>(500);
  const [newExpiryDate, setNewExpiryDate] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: tenants, isLoading, refetch } = useQuery('tenants', () => adminAPI.listTenants(0, 1000));

  const updateMutation = useMutation(
    ({ tenantId, limit, expiresAt }: { tenantId: number; limit: number; expiresAt?: string | null }) => 
      adminAPI.updateTenantStorageLimit(tenantId, limit, expiresAt),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tenants');
        queryClient.invalidateQueries('systemStats');
        setEditingTenant(null);
        alert('Storage limit updated successfully!');
      },
      onError: (error: any) => {
        alert(`Failed to update storage limit: ${error?.response?.data?.detail || error?.message || 'Unknown error'}`);
      }
    }
  );

  const handleEdit = (tenant: any) => {
    setEditingTenant(tenant.id);
    setNewLimit(tenant.storage_limit_mb);
    // Format expiry date for input (YYYY-MM-DD)
    if (tenant.expires_at) {
      const date = new Date(tenant.expires_at);
      setNewExpiryDate(date.toISOString().split('T')[0]);
    } else {
      setNewExpiryDate('');
    }
  };

  const handleSave = (tenantId: number) => {
    console.log('[STORAGE] Saving for tenant:', tenantId, 'limit:', newLimit, 'expiresAt:', newExpiryDate);
    if (!newLimit || newLimit <= 0) {
      alert('Storage limit must be greater than 0');
      return;
    }
    const expiresAt = newExpiryDate ? new Date(newExpiryDate + 'T00:00:00Z').toISOString() : null;
    console.log('[STORAGE] Calling mutation with:', { tenantId, limit: newLimit, expiresAt });
    updateMutation.mutate({ tenantId, limit: newLimit, expiresAt });
  };

  const handleCancel = () => {
    setEditingTenant(null);
    setNewLimit(500);
    setNewExpiryDate('');
  };

  if (isLoading) {
    return <div className="text-center py-4 text-gray-500">Loading tenants...</div>;
  }

  if (!tenants || tenants.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No tenants found. Create a tenant first.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Usage</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Storage Limit</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expires At</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tenants.map((tenant: any) => {
            const storageUsedMb = tenant.storage_used_bytes ? (tenant.storage_used_bytes / (1024 * 1024)).toFixed(2) : '0.00';
            const isEditing = editingTenant === tenant.id;
            
            return (
              <tr key={tenant.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                  <div className="text-xs text-gray-500">{tenant.subdomain}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{storageUsedMb} MB</div>
                  <div className="text-xs text-gray-500">
                    {tenant.storage_limit_mb ? 
                      `${((tenant.storage_used_bytes / (tenant.storage_limit_mb * 1024 * 1024)) * 100).toFixed(1)}%` : 
                      '0%'}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isEditing ? (
                    <div className="flex flex-col space-y-2">
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={newLimit || ''}
                          onChange={(e) => {
                            const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
                            if (!isNaN(val) && val >= 0) {
                              setNewLimit(val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSave(tenant.id);
                            }
                          }}
                          autoFocus
                          disabled={updateMutation.isLoading}
                          className="w-24 px-2 py-1 border-2 border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          placeholder="MB"
                        />
                        <span className="text-sm text-gray-600">MB</span>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-900">{tenant.storage_limit_mb} MB</div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {isEditing ? (
                    <input
                      type="date"
                      value={newExpiryDate}
                      onChange={(e) => setNewExpiryDate(e.target.value)}
                      className="px-2 py-1 border-2 border-blue-500 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-900">
                      {tenant.expires_at ? new Date(tenant.expires_at).toLocaleDateString() : 'Never'}
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {isEditing ? (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleSave(tenant.id)}
                        disabled={updateMutation.isLoading}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancel}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(tenant)}
                      className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    >
                      Edit Limit
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
