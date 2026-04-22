import { create } from "zustand";
import { api, MeResponse, GoogleCallbackResponse, LoginCredentials, RegisterData } from "@/lib/api-client";

// User type for frontend state
export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  avatar?: string;
  role: string;
  isAdmin: boolean;
  isVendor: boolean;
  isMacondoAdmin: boolean;
  isStudioAdmin: boolean;
  maxModelsLimit: number;
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

  // Acciones actualizadas
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
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

function parseUserFromMe(data: MeResponse | any): AuthUser {
  const role = (data.role || "MODELO").toUpperCase();
  return {
    id: data.user_id,
    email: data.email,
    name: data.name,
    avatar: data.picture || data.avatar_url || "",
    role: role,
    isAdmin: role === "MACONDO_ADMIN",
    isVendor: role === "ESTUDIO_ADMIN",
    isMacondoAdmin: role === "MACONDO_ADMIN",
    isStudioAdmin: role === "ESTUDIO_ADMIN",
    maxModelsLimit: data.max_models_limit || 5,
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

  // --- NUEVAS FUNCIONES DE LOGIN Y REGISTRO ---
  login: async (credentials: LoginCredentials) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.login(credentials);
      const authUser = parseUserFromMe(response);
      set({
        user: authUser,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al iniciar sesión",
        isLoading: false,
      });
      throw error;
    }
  },

  register: async (data: RegisterData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.register(data);
      const authUser = parseUserFromMe(response);
      set({
        user: authUser,
        token: response.access_token,
        isAuthenticated: true,
        isLoading: false,
        isInitialized: true,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al registrarse",
        isLoading: false,
      });
      throw error; // Lanzamos el error para que la interfaz sepa que falló
    }
  },
  // --------------------------------------------

  setUser: (user) => {
    set({ user, isAuthenticated: true });
  },

  setToken: (token) => {
    api.setToken(token);
    set({ token });
  },

  initializeFromCookie: async () => {
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
        error: error instanceof Error ? error.message : "Error al iniciar sesion",
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
        const role = (userData.role || "MODELO").toUpperCase();
        set({
          user: {
            ...currentUser,
            dailyLimit: userData.daily_limit ?? currentUser.dailyLimit,
            usedQuota: userData.used_quota ?? currentUser.usedQuota,
            isUnlimited: userData.is_unlimited ?? currentUser.isUnlimited,
            quotaResetAt: userData.quota_reset_at || currentUser.quotaResetAt,
            role: role,
            isAdmin: role === "MACONDO_ADMIN",
            isVendor: role === "ESTUDIO_ADMIN",
            isMacondoAdmin: role === "MACONDO_ADMIN",
            isStudioAdmin: role === "ESTUDIO_ADMIN",
          },
        });
      }
    } catch {
      // Silently fail quota refresh
    }
  },

  clearError: () => set({ error: null }),
}));