import { create } from 'zustand';

interface User {
  id: number;
  email: string;
  is_admin: boolean;
  is_tenant_admin: boolean;
  tenant_id?: number;
}

interface AuthState {
  user: User | null;
  token: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  isLoading: boolean;
  setLoading: (loading: boolean) => void;
}

// Load initial state from localStorage
const loadStoredAuth = (): { user: User | null; token: string | null } => {
  if (typeof window === 'undefined') {
    return { user: null, token: null };
  }
  
  try {
    const storedUser = localStorage.getItem('auth_user');
    const storedToken = localStorage.getItem('access_token');
    
    if (storedUser && storedToken) {
      return {
        user: JSON.parse(storedUser),
        token: storedToken
      };
    }
  } catch (error) {
    console.error('Error loading stored auth:', error);
  }
  
  return { user: null, token: null };
};

const storedAuth = loadStoredAuth();

export const useAuthStore = create<AuthState>((set) => ({
  user: storedAuth.user,
  token: storedAuth.token,
  isLoading: false,
  setAuth: (user, token) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
    }
    set({ user, token, isLoading: false });
  },
  clearAuth: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('auth_user');
    }
    set({ user: null, token: null, isLoading: false });
  },
  setLoading: (loading) => set({ isLoading: loading }),
}));

