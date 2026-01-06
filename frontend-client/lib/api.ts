import axios from 'axios';

// Get API URL - use window location in browser, fallback to localhost
const getApiUrl = () => {
  // First, check environment variable (highest priority)
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  if (typeof window !== 'undefined') {
    // In browser, detect protocol from current page
    const protocol = window.location.protocol; // 'http:' or 'https:'
    const hostname = window.location.hostname;
    
    // If running on localhost/127.0.0.1, use HTTP (backend default)
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('admin.localhost')) {
      return 'http://localhost:8000';
    }
    
    // For production/other domains, match the current protocol
    // Extract port from current location or use default
    const port = window.location.port ? `:${window.location.port === '3000' ? '8000' : window.location.port}` : '';
    return `${protocol}//${hostname}${port}`;
  }
  
  // Server-side: In Docker, use service name; otherwise use localhost
  // Check if we're in Docker by looking for DOCKER environment or use backend service name
  if (process.env.DOCKER || process.env.NODE_ENV === 'production') {
    // In Docker, use the backend service name
    return 'http://backend:8000';
  }
  
  // Local development server-side fallback
  return 'http://localhost:8000';
};

const API_URL = getApiUrl();

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle auth errors and network errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log error for debugging
    if (typeof window !== 'undefined') {
      console.error('API Error:', {
        message: error.message,
        code: error.code,
        url: error.config?.url,
        baseURL: error.config?.baseURL,
        response: error.response?.data,
        status: error.response?.status
      });
    }
    
    // Handle network errors (connection refused, etc.)
    if (!error.response && error.request) {
      console.error('Network Error - Backend not reachable:', error.config?.baseURL);
      // Don't reject here, let the component handle it
    }
    
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        // Don't redirect during login flow - let the login page handle it
        const path = window.location.pathname;
        if (!path.includes('/login') && !error.config?.url?.includes('/me')) {
          localStorage.removeItem('access_token');
          window.location.href = '/login';
        }
      }
    }
    if (error.response?.status === 403) {
      // 403 Forbidden - user doesn't have admin access
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path.includes('/admin') && !path.includes('/login')) {
          alert('Access denied. Admin privileges required.');
          window.location.href = '/admin/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;

// Auth API
export const authAPI = {
  login: async (email: string, password: string) => {
    const params = new URLSearchParams();
    params.append('username', email);
    params.append('password', password);
    const response = await api.post('/api/auth/login', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return response.data;
  },
  register: async (email: string, password: string, tenantId?: number) => {
    const response = await api.post('/api/auth/register', {
      email,
      password,
      tenant_id: tenantId,
    });
    return response.data;
  },
  getMe: async () => {
    // Ensure token is in headers for this request
    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    const response = await api.get('/api/auth/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
    return response.data;
  },
  changePassword: async (currentPassword: string, newPassword: string) => {
    const response = await api.post('/api/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword
    });
    return response.data;
  },
};

// Admin API
export const adminAPI = {
  createTenant: async (data: {
    name: string;
    email: string;
    subdomain: string;
    storage_limit_mb?: number;
    expires_in_days?: number;
    password?: string;
  }) => {
    const response = await api.post('/api/admin/tenants', data);
    return response.data;
  },
  updateTenant: async (tenantId: number, data: {
    name?: string;
    email?: string;
    storage_limit_mb?: number;
    expires_in_days?: number;
    is_active?: boolean;
  }) => {
    const response = await api.put(`/api/admin/tenants/${tenantId}`, data);
    return response.data;
  },
  getTenantDetails: async (tenantId: number) => {
    const response = await api.get(`/api/admin/tenants/${tenantId}/details`);
    return response.data;
  },
  listTenants: async (skip = 0, limit = 100) => {
    const response = await api.get(`/api/admin/tenants?skip=${skip}&limit=${limit}`);
    return response.data;
  },
  getTenantStats: async (tenantId: number) => {
    const response = await api.get(`/api/admin/tenants/${tenantId}`);
    return response.data;
  },
  deleteTenant: async (tenantId: number) => {
    const response = await api.delete(`/api/admin/tenants/${tenantId}`);
    return response.data;
  },
  getSystemStats: async () => {
    const response = await api.get('/api/admin/stats');
    return response.data;
  },
  listB2Credentials: async () => {
    const response = await api.get('/api/admin/b2-credentials');
    return response.data;
  },
  testB2Connection: async () => {
    const response = await api.post('/api/admin/b2-credentials/test');
    return response.data;
  },
  testB2Credential: async (credentialId: number) => {
    const response = await api.post(`/api/admin/b2-credentials/${credentialId}/test`);
    return response.data;
  },
  getB2Config: async () => {
    const response = await api.get('/api/admin/b2-config');
    return response.data;
  },
  listUsers: async (skip = 0, limit = 100) => {
    const response = await api.get(`/api/admin/users?skip=${skip}&limit=${limit}`);
    return response.data;
  },
  getSystemHealth: async () => {
    const response = await api.get('/api/admin/health');
    return response.data;
  },
  updateB2Config: async (config: { key_id: string; key: string; bucket_name: string; endpoint?: string }) => {
    const response = await api.post('/api/admin/b2-config/update', config);
    return response.data;
  },
  updateTenantStorageLimit: async (tenantId: number, storageLimitMb: number, expiresAt?: string | null) => {
    const response = await api.patch(`/api/admin/tenants/${tenantId}/storage-limit`, {
      storage_limit_mb: storageLimitMb,
      expires_at: expiresAt || null
    });
    return response.data;
  },
  getApiLogs: async (skip = 0, limit = 100, filters?: { method?: string; status_code?: number; user_id?: number; tenant_id?: number }) => {
    const params = new URLSearchParams({ skip: skip.toString(), limit: limit.toString() });
    if (filters?.method) params.append('method', filters.method);
    if (filters?.status_code) params.append('status_code', filters.status_code.toString());
    if (filters?.user_id) params.append('user_id', filters.user_id.toString());
    if (filters?.tenant_id) params.append('tenant_id', filters.tenant_id.toString());
    const response = await api.get(`/api/admin/api-logs?${params.toString()}`);
    return response.data;
  },
};

// Tenant API
export const tenantAPI = {
  requestUpload: async (filename: string, contentType: string, fileSizeBytes: number) => {
    const response = await api.post('/api/tenant/photos/upload', {
      filename,
      content_type: contentType,
      file_size_bytes: fileSizeBytes,
    });
    return response.data;
  },
  confirmUpload: async (photoId: number) => {
    const response = await api.post(`/api/tenant/photos/${photoId}/confirm`);
    return response.data;
  },
  listPhotos: async (skip = 0, limit = 100) => {
    const response = await api.get(`/api/tenant/photos?skip=${skip}&limit=${limit}`);
    return response.data;
  },
  getPhoto: async (photoId: number) => {
    const response = await api.get(`/api/tenant/photos/${photoId}`);
    return response.data;
  },
  deletePhoto: async (photoId: number) => {
    const response = await api.delete(`/api/tenant/photos/${photoId}`);
    return response.data;
  },
  getStorageInfo: async () => {
    const response = await api.get('/api/tenant/storage');
    return response.data;
  },
  getTenantInfo: async () => {
    const response = await api.get('/api/tenant/info');
    return response.data;
  },
  getUsageLogs: async (skip = 0, limit = 50) => {
    const response = await api.get(`/api/tenant/usage-logs?skip=${skip}&limit=${limit}`);
    return response.data;
  },
};

