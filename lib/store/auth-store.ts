import { create } from "zustand";
import { api, MeResponse, GoogleCallbackResponse } from "@/lib/api-client";

// User type for frontend state
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: string;
  isAdmin: boolean;
  isVendor: boolean;
  dailyLimit: number;
  usedQuota: number;
  isUnlimited: boolean;
  quotaResetAt: string;
}

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAuthenticated: boolean;
  error: string | null;

  // Actions
  loginWithGoogle: () => void;
  handleGoogleCallback: (code: string) => Promise<AuthUser>;
  logout: () => void;
  fetchUser: () => Promise<void>;
  refreshQuota: () => Promise<void>;
  clearError: () => void;
  setUser: (user: AuthUser) => void;
  setToken: (token: string) => void;
  initializeFromCookie: () => Promise<void>;
}

// Helper para parsear respuesta de /auth/me a AuthUser
function parseUserFromMe(data: MeResponse): AuthUser {
  const role = (data.role || "CREATOR").toUpperCase();
  return {
    id: data.user_id,
    email: data.email,
    role: role,
    isAdmin: role === "ADMIN",
    isVendor: role === "VENDOR",
    dailyLimit: data.daily_limit ?? 10,
    usedQuota: data.used_quota ?? 0,
    isUnlimited: data.is_unlimited ?? false,
    quotaResetAt: data.quota_reset_at || "",
  };
}

// Helper para parsear respuesta de Google callback a AuthUser
function parseUserFromCallback(data: GoogleCallbackResponse): AuthUser {
  const role = (data.role || "CREATOR").toUpperCase();
  return {
    id: data.user_id || "",
    email: data.email || "",
    avatar: data.avatar_url || data.picture || "",
    role: role,
    isAdmin: role === "ADMIN",
    isVendor: role === "VENDOR",
    dailyLimit: data.daily_limit ?? 10,
    usedQuota: data.used_quota ?? 0,
    isUnlimited: data.is_unlimited ?? false,
    quotaResetAt: data.quota_reset_at || "",
  };
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  isInitialized: false,
  isAuthenticated: false,
  error: null,

  setUser: (user) => {
    set({ user, isAuthenticated: true });
  },

  setToken: (token) => {
    api.setToken(token);
    set({ token });
  },

  initializeFromCookie: async () => {
    // Evitar inicializar multiples veces
    if (get().isInitialized) return;

    const token = api.getToken();
    if (!token) {
      set({ isInitialized: true, isAuthenticated: false });
      return;
    }

    set({ isLoading: true, token });

    try {
      const userData = await api.getCurrentUser();
      const authUser = parseUserFromMe(userData);
      set({
        user: authUser,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });
    } catch {
      // Token invalido o expirado
      api.setToken(null);
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        isInitialized: true,
      });
    }
  },

  handleGoogleCallback: async (code: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.handleGoogleCallback(code);
      const authUser = parseUserFromCallback(response);
      set({
        user: authUser,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });
      return authUser;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Error al iniciar sesion",
        isLoading: false,
      });
      throw error;
    }
  },

  loginWithGoogle: () => {
    api.loginWithGoogle();
  },

  logout: () => {
    api.logout();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      error: null,
    });
    // Redirigir a login
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
  },

  fetchUser: async () => {
    const token = api.getToken();
    if (!token) {
      set({ user: null, isAuthenticated: false });
      return;
    }

    set({ isLoading: true });
    try {
      const userData = await api.getCurrentUser();
      const authUser = parseUserFromMe(userData);
      set({ user: authUser, isAuthenticated: true, isLoading: false });
    } catch {
      api.setToken(null);
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  refreshQuota: async () => {
    const token = api.getToken();
    if (!token) return;

    try {
      const userData = await api.getCurrentUser();
      const currentUser = get().user;
      if (currentUser) {
        set({
          user: {
            ...currentUser,
            dailyLimit: userData.daily_limit ?? currentUser.dailyLimit,
            usedQuota: userData.used_quota ?? currentUser.usedQuota,
            isUnlimited: userData.is_unlimited ?? currentUser.isUnlimited,
            quotaResetAt: userData.quota_reset_at || currentUser.quotaResetAt,
            role: userData.role || currentUser.role,
            isAdmin: (userData.role || "").toUpperCase() === "ADMIN",
            isVendor: (userData.role || "").toUpperCase() === "VENDOR",
          },
        });
      }
    } catch {
      // Silently fail quota refresh
    }
  },

  clearError: () => set({ error: null }),
}));
