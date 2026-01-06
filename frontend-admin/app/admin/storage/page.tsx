'use client';

import { useState, useEffect } from 'react';
import { adminAPI } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { format } from 'date-fns';

type StorageType = 'b2' | 's3' | 'azure' | 'gcs';

interface StorageConfig {
  id?: number;
  type: StorageType;
  name: string;
  key_id?: string;
  key?: string;
  bucket_name: string;
  endpoint?: string;
  region?: string;
  is_active: boolean;
  tenant_id?: number | null;
}

interface Tenant {
  id: number;
  name: string;
  subdomain: string;
}

export default function StorageDashboardPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedStorageType, setSelectedStorageType] = useState<StorageType>('b2');
  const [storageConfig, setStorageConfig] = useState<StorageConfig>({
    type: 'b2',
    name: '',
    bucket_name: '',
    endpoint: '',
    is_active: true,
    tenant_id: null
  });
  const [showKey, setShowKey] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  // Fetch existing storage configurations (B2 credentials)
  const { data: credentials, isLoading: credsLoading, refetch: refetchCreds } = useQuery(
    'b2Credentials',
    adminAPI.listB2Credentials,
    { retry: 2 }
  );

  // Fetch tenants for assignment
  const { data: tenants, isLoading: tenantsLoading } = useQuery(
    'tenants',
    () => adminAPI.listTenants(0, 1000),
    { retry: 2 }
  );

  // Fetch system stats
  const { data: systemStats } = useQuery('systemStats', adminAPI.getSystemStats, { retry: 2 });

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

  const handleAddStorage = () => {
    setStorageConfig({
      type: selectedStorageType,
      name: '',
      bucket_name: '',
      endpoint: '',
      is_active: true,
      tenant_id: null
    });
    setShowAddModal(true);
  };

  const handleSaveStorage = async () => {
    if (!storageConfig.name || !storageConfig.bucket_name) {
      alert('Please fill in all required fields');
      return;
    }

    if (storageConfig.type === 'b2' && (!storageConfig.key_id || !storageConfig.key)) {
      alert('B2 storage requires Key ID and Key');
      return;
    }

    setSaving(true);
    try {
      // For now, we'll use B2 API. Later we can extend to support other types
      if (storageConfig.type === 'b2') {
        await adminAPI.updateB2Config({
          key_id: storageConfig.key_id!,
          key: storageConfig.key!,
          bucket_name: storageConfig.bucket_name,
          endpoint: storageConfig.endpoint || ''
        });
        alert('Storage configuration saved successfully!');
        setShowAddModal(false);
        refetchCreds();
        queryClient.invalidateQueries('b2Config');
      } else {
        alert(`${storageConfig.type.toUpperCase()} storage type not yet implemented`);
      }
    } catch (error: any) {
      alert(`Failed to save: ${error?.response?.data?.detail || error?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = (credId?: number) => {
    setTesting(true);
    setConnectionStatus({ status: 'testing', message: 'Testing connection...' });
    testMutation.mutate();
  };

  const handleAssignToTenant = async (credId: number, tenantId: number) => {
    try {
      // This would need a new API endpoint
      alert('Assigning storage to tenant... (API endpoint needed)');
      refetchCreds();
    } catch (error: any) {
      alert(`Failed to assign: ${error?.response?.data?.detail || error?.message}`);
    }
  };

  const getStorageTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'b2': 'Backblaze B2',
      's3': 'Amazon S3',
      'azure': 'Azure Blob Storage',
      'gcs': 'Google Cloud Storage'
    };
    return labels[type] || type.toUpperCase();
  };

  const getStorageTypeIcon = (type: string) => {
    switch (type) {
      case 'b2':
        return '☁️';
      case 's3':
        return '📦';
      case 'azure':
        return '🔷';
      case 'gcs':
        return '🌐';
      default:
        return '💾';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Storage Dashboard</h1>
          <p className="mt-2 text-sm text-gray-600">Manage storage configurations and assign to tenants</p>
        </div>
        <button
          onClick={handleAddStorage}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span>Add Storage</span>
        </button>
      </div>

      {/* Storage Statistics */}
      {systemStats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{systemStats.total_storage_used_mb?.toFixed(2) || 0} MB</div>
            <div className="text-sm text-gray-600 mt-1">Total Storage Used</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{systemStats.total_photos || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Total Files</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{systemStats.active_tenants || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Active Tenants</div>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-2xl font-bold text-gray-900">{credentials?.length || 0}</div>
            <div className="text-sm text-gray-600 mt-1">Storage Configs</div>
          </div>
        </div>
      )}

      {/* Storage Configurations List */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Storage Configurations</h2>
          <p className="text-sm text-gray-600 mt-1">Manage and assign storage to tenants</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bucket</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned To</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Connection</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {credsLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">Loading...</td>
                </tr>
              ) : credentials && credentials.length > 0 ? (
                credentials.map((cred: any) => (
                  <tr key={cred.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className="text-2xl">{getStorageTypeIcon('b2')}</span>
                        <span className="text-sm font-medium text-gray-900">{getStorageTypeLabel('b2')}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 font-mono">{cred.key_id?.substring(0, 20)}...</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{cred.bucket_name || 'N/A'}</div>
                      {cred.endpoint && (
                        <div className="text-xs text-gray-500">{cred.endpoint}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {cred.tenant_id ? (
                        <span className="text-sm text-gray-900">
                          {tenants?.find((t: Tenant) => t.id === cred.tenant_id)?.name || `Tenant #${cred.tenant_id}`}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-500">Default (Unassigned)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        cred.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {cred.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleTestConnection(cred.id)}
                        disabled={testing}
                        className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50"
                      >
                        {testing ? 'Testing...' : 'Test'}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <select
                        onChange={(e) => {
                          const tenantId = e.target.value ? parseInt(e.target.value) : null;
                          if (tenantId) {
                            handleAssignToTenant(cred.id, tenantId);
                          }
                        }}
                        value={cred.tenant_id || ''}
                        className="text-sm border border-gray-300 rounded px-2 py-1"
                      >
                        <option value="">Assign to Tenant...</option>
                        {tenants?.map((tenant: Tenant) => (
                          <option key={tenant.id} value={tenant.id}>
                            {tenant.name} ({tenant.subdomain})
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No storage configurations found. Click "Add Storage" to create one.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Storage Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-4">Add Storage Configuration</h2>
            
            {/* Storage Type Selector */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Storage Type</label>
              <div className="grid grid-cols-4 gap-4">
                {(['b2', 's3', 'azure', 'gcs'] as StorageType[]).map((type) => (
                  <button
                    key={type}
                    onClick={() => {
                      setSelectedStorageType(type);
                      setStorageConfig({ ...storageConfig, type });
                    }}
                    className={`p-4 border-2 rounded-lg transition-all ${
                      selectedStorageType === type
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">{getStorageTypeIcon(type)}</div>
                    <div className="text-sm font-medium">{getStorageTypeLabel(type)}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Configuration Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Configuration Name *</label>
                <input
                  type="text"
                  value={storageConfig.name}
                  onChange={(e) => setStorageConfig({ ...storageConfig, name: e.target.value })}
                  placeholder="My B2 Storage"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              {selectedStorageType === 'b2' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Application Key ID *</label>
                    <input
                      type="text"
                      value={storageConfig.key_id || ''}
                      onChange={(e) => setStorageConfig({ ...storageConfig, key_id: e.target.value })}
                      placeholder="003efd17c411f3d0000000001"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Application Key *</label>
                    <div className="relative">
                      <input
                        type={showKey ? "text" : "password"}
                        value={storageConfig.key || ''}
                        onChange={(e) => setStorageConfig({ ...storageConfig, key: e.target.value })}
                        placeholder="K001xxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 pr-10 text-gray-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showKey ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Bucket Name *</label>
                <input
                  type="text"
                  value={storageConfig.bucket_name}
                  onChange={(e) => setStorageConfig({ ...storageConfig, bucket_name: e.target.value })}
                  placeholder="my-bucket-name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Endpoint URL</label>
                <input
                  type="text"
                  value={storageConfig.endpoint || ''}
                  onChange={(e) => setStorageConfig({ ...storageConfig, endpoint: e.target.value })}
                  placeholder={selectedStorageType === 'b2' ? 'https://s3.us-west-000.backblazeb2.com' : 'https://...'}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-gray-900"
                />
              </div>

              <div className="flex items-center space-x-4 pt-4">
                <button
                  onClick={handleSaveStorage}
                  disabled={saving}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
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
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Test Result */}
      {connectionStatus && (
        <div className={`mt-4 p-4 rounded-lg border-2 ${
          connectionStatus.status === 'connected' ? 'bg-green-50 border-green-200' :
          connectionStatus.status === 'error' ? 'bg-red-50 border-red-200' :
          'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="font-semibold">Connection Status: {connectionStatus.status?.toUpperCase()}</div>
          <div className="text-sm mt-1">{connectionStatus.message}</div>
        </div>
      )}
    </div>
  );
}
