import { create } from "zustand";
import { api, User, LoginCredentials, RegisterData } from "@/lib/api-client";

// Extended user for frontend state (includes fields from Google callback)
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: string;
  isAdmin: boolean;
  dailyLimit: number;
  usedQuota: number;
  isUnlimited: boolean;
  quotaResetAt: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  
  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  loginWithGoogle: () => void;
  logout: () => void;
  fetchUser: () => Promise<void>;
  clearError: () => void;
  setUser: (user: AuthUser) => void;
  setToken: (token: string) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isAuthenticated: false,
  error: null,

  setUser: (user) => {
    set({ user, isAuthenticated: true });
  },

  setToken: (token) => {
    api.setToken(token);
    set({ token });
  },

  login: async (credentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.login(credentials);
      const authUser: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role,
        isAdmin: response.user.role === "admin",
        dailyLimit: response.user.quota,
        usedQuota: response.user.used_quota,
        isUnlimited: false,
        quotaResetAt: "",
      };
      set({ 
        user: authUser, 
        token: response.access_token,
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Error al iniciar sesion",
        isLoading: false 
      });
      throw error;
    }
  },

  register: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.register(data);
      const authUser: AuthUser = {
        id: response.user.id,
        email: response.user.email,
        name: response.user.name,
        role: response.user.role,
        isAdmin: response.user.role === "admin",
        dailyLimit: response.user.quota,
        usedQuota: response.user.used_quota,
        isUnlimited: false,
        quotaResetAt: "",
      };
      set({ 
        user: authUser, 
        token: response.access_token,
        isAuthenticated: true, 
        isLoading: false 
      });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Error al registrarse",
        isLoading: false 
      });
      throw error;
    }
  },

  loginWithGoogle: () => {
    api.loginWithGoogle();
  },

  logout: () => {
    api.logout();
    // Eliminar cookie
    if (typeof document !== "undefined") {
      document.cookie = "mf_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    }
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  fetchUser: async () => {
    set({ isLoading: true });
    try {
      const user = await api.getCurrentUser();
      const authUser: AuthUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isAdmin: user.role === "admin",
        dailyLimit: user.quota,
        usedQuota: user.used_quota,
        isUnlimited: false,
        quotaResetAt: "",
      };
      set({ user: authUser, isAuthenticated: true, isLoading: false });
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
