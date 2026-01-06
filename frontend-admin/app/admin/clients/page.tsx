'use client';

import { useState } from 'react';
import { adminAPI } from '@/lib/api';
import { useQuery, useMutation } from 'react-query';
import { format } from 'date-fns';
import { useQueryClient } from 'react-query';

interface Tenant {
  id: number;
  subdomain: string;
  name: string;
  email: string;
  storage_limit_mb: number;
  storage_used_bytes: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
}

interface TenantDetails {
  id: number;
  subdomain: string;
  name: string;
  email: string;
  storage_limit_mb: number;
  storage_used_bytes: number;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  dns_record?: string;
  b2_bucket?: string;
  user_count?: number;
  photo_count?: number;
}

export default function ClientsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [tenantDetails, setTenantDetails] = useState<TenantDetails | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    subdomain: '',
    name: '',
    email: '',
    storage_limit_mb: 500,
    expires_in_days: 90,
    password: ''
  });
  const [editData, setEditData] = useState({
    name: '',
    email: '',
    storage_limit_mb: 500,
    expires_in_days: 90,
    is_active: true
  });

  const queryClient = useQueryClient();

  const { data: tenants, isLoading, refetch } = useQuery('tenants', () => adminAPI.listTenants(0, 1000), {
    refetchOnWindowFocus: true,
  });

  const createMutation = useMutation(
    (data: typeof formData) => adminAPI.createTenant({
      subdomain: data.subdomain,
      name: data.name,
      email: data.email,
      storage_limit_mb: data.storage_limit_mb,
      expires_in_days: data.expires_in_days,
      password: data.password || undefined
    }),
    {
      onSuccess: (response: any) => {
        queryClient.invalidateQueries('tenants');
        setShowCreateModal(false);
        if (response.password) {
          setCreatedPassword(response.password);
        }
        setFormData({ subdomain: '', name: '', email: '', storage_limit_mb: 500, expires_in_days: 90, password: '' });
      },
      onError: (error: any) => {
        alert(`Failed to register client: ${error?.response?.data?.detail || error?.message || 'Unknown error'}`);
      }
    }
  );

  const updateMutation = useMutation(
    (data: typeof editData) => adminAPI.updateTenant(selectedTenant!.id, data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('tenants');
        setIsEditing(false);
        if (selectedTenant) {
          adminAPI.getTenantDetails(selectedTenant.id).then(setTenantDetails).catch(console.error);
        }
        alert('Client updated successfully!');
      },
      onError: (error: any) => {
        alert(`Failed to update client: ${error?.response?.data?.detail || error?.message || 'Unknown error'}`);
      }
    }
  );

  const handleCreate = () => {
    if (!formData.subdomain || !formData.name || !formData.email) {
      alert('Please fill in all required fields');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleViewDetails = async (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setIsEditing(false);
    try {
      const details = await adminAPI.getTenantDetails(tenant.id);
      setTenantDetails(details);
      setEditData({
        name: details.name,
        email: details.email,
        storage_limit_mb: details.storage_limit_mb,
        expires_in_days: details.expires_at ? Math.ceil((new Date(details.expires_at).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 90,
        is_active: details.is_active
      });
    } catch (error) {
      console.error('Failed to load tenant details:', error);
      setTenantDetails(null);
    }
  };

  const handleSaveEdit = () => {
    updateMutation.mutate(editData);
  };

  const getDaysRemaining = (expiresAt: string | null) => {
    if (!expiresAt) return 'No expiry';
    const days = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return days > 0 ? `${days} days` : 'Expired';
  };

  const getStoragePercentage = (used: number, limit: number) => {
    return limit > 0 ? ((used / (limit * 1024 * 1024)) * 100).toFixed(1) : '0';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Client Registration</h1>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>Register New Client</span>
          </button>
        </div>

        {/* Clients Table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Subdomain</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Storage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expires</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {tenants && tenants.length > 0 ? (
                tenants.map((tenant: Tenant) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{tenant.name}</div>
                      <div className="text-sm text-gray-500">{tenant.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{tenant.subdomain}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(tenant.storage_used_bytes / (1024 * 1024)).toFixed(2)} MB / {tenant.storage_limit_mb} MB
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                        <div
                          className={`h-2 rounded-full ${
                            parseFloat(getStoragePercentage(tenant.storage_used_bytes, tenant.storage_limit_mb)) > 80
                              ? 'bg-red-500'
                              : parseFloat(getStoragePercentage(tenant.storage_used_bytes, tenant.storage_limit_mb)) > 60
                              ? 'bg-yellow-500'
                              : 'bg-green-500'
                          }`}
                          style={{
                            width: `${Math.min(100, parseFloat(getStoragePercentage(tenant.storage_used_bytes, tenant.storage_limit_mb)))}%`
                          }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          tenant.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tenant.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getDaysRemaining(tenant.expires_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(tenant.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleViewDetails(tenant)}
                        className="text-blue-600 hover:text-blue-900 font-medium"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                    No clients registered yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">Register New Client</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain *</label>
                <input
                  type="text"
                  value={formData.subdomain}
                  onChange={(e) => setFormData({ ...formData, subdomain: e.target.value })}
                  placeholder="client-name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Client Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Client Company Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="client@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Storage Limit (MB)</label>
                <input
                  type="number"
                  value={formData.storage_limit_mb}
                  onChange={(e) => setFormData({ ...formData, storage_limit_mb: parseInt(e.target.value) || 500 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expires In (Days)</label>
                <input
                  type="number"
                  value={formData.expires_in_days}
                  onChange={(e) => setFormData({ ...formData, expires_in_days: parseInt(e.target.value) || 90 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password (Optional - auto-generated if empty)</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave empty to auto-generate"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createMutation.isLoading ? 'Registering...' : 'Register Client'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Display Modal */}
      {createdPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-green-600">✓ Client Created Successfully!</h2>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-yellow-800 mb-2">Client Login Credentials:</p>
              <div className="space-y-2">
                <div>
                  <span className="font-semibold">Email:</span> {formData.email || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold">Password:</span>
                  <div className="mt-1 flex items-center space-x-2">
                    <code className="bg-gray-100 px-3 py-1 rounded font-mono text-sm flex-1">{createdPassword}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(createdPassword);
                        alert('Password copied to clipboard!');
                      }}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">Please save these credentials securely. The password will not be shown again.</p>
            <button
              onClick={() => {
                setCreatedPassword(null);
                setFormData({ subdomain: '', name: '', email: '', storage_limit_mb: 500, expires_in_days: 90, password: '' });
              }}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* View/Edit Client Details Modal */}
      {selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setSelectedTenant(null); setIsEditing(false); setTenantDetails(null); }}>
          <div className="bg-white rounded-lg p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">{isEditing ? 'Edit Client' : 'Client Details'}</h2>
              <button
                onClick={() => { setSelectedTenant(null); setIsEditing(false); setTenantDetails(null); }}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Resource Mappings Section */}
              {tenantDetails && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Resource Mappings</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">DNS Record:</span>
                      <div className="text-gray-900 font-mono">{tenantDetails.dns_record || 'Not configured'}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">B2 Bucket:</span>
                      <div className="text-gray-900">{tenantDetails.b2_bucket || 'Default bucket'}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Users:</span>
                      <div className="text-gray-900">{tenantDetails.user_count || 0}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Photos:</span>
                      <div className="text-gray-900">{tenantDetails.photo_count || 0}</div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subdomain</label>
                  <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{selectedTenant.subdomain}</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  {isEditing ? (
                    <select
                      value={editData.is_active ? 'true' : 'false'}
                      onChange={(e) => setEditData({ ...editData, is_active: e.target.value === 'true' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="true">Active</option>
                      <option value="false">Inactive</option>
                    </select>
                  ) : (
                    <div>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedTenant.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedTenant.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.name}
                      onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{selectedTenant.name}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editData.email}
                      onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="text-sm text-gray-900 bg-gray-50 px-3 py-2 rounded-lg">{selectedTenant.email}</div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Storage Usage</label>
                  <div className="text-sm text-gray-900">
                    {(selectedTenant.storage_used_bytes / (1024 * 1024)).toFixed(2)} MB / {isEditing ? editData.storage_limit_mb : selectedTenant.storage_limit_mb} MB
                  </div>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.storage_limit_mb}
                      onChange={(e) => setEditData({ ...editData, storage_limit_mb: parseInt(e.target.value) || 500 })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mt-1"
                    />
                  ) : (
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                      <div
                        className={`h-2 rounded-full ${
                          parseFloat(getStoragePercentage(selectedTenant.storage_used_bytes, selectedTenant.storage_limit_mb)) > 80
                            ? 'bg-red-500'
                            : parseFloat(getStoragePercentage(selectedTenant.storage_used_bytes, selectedTenant.storage_limit_mb)) > 60
                            ? 'bg-yellow-500'
                            : 'bg-green-500'
                        }`}
                        style={{
                          width: `${Math.min(100, parseFloat(getStoragePercentage(selectedTenant.storage_used_bytes, selectedTenant.storage_limit_mb)))}%`
                        }}
                      ></div>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expires</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.expires_in_days}
                      onChange={(e) => setEditData({ ...editData, expires_in_days: parseInt(e.target.value) || 90 })}
                      placeholder="Days"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <>
                      <div className="text-sm text-gray-900">{getDaysRemaining(selectedTenant.expires_at)}</div>
                      {selectedTenant.expires_at && (
                        <div className="text-xs text-gray-500 mt-1">
                          {format(new Date(selectedTenant.expires_at), 'MMM dd, yyyy')}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registered</label>
                  <div className="text-sm text-gray-900">{format(new Date(selectedTenant.created_at), 'MMM dd, yyyy')}</div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={updateMutation.isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => { setSelectedTenant(null); setIsEditing(false); setTenantDetails(null); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Edit Client
                  </button>
                  <button
                    onClick={() => {
                      window.location.href = `/admin/storage?tenant=${selectedTenant.id}`;
                    }}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Manage Storage
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

