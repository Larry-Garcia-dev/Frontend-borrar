import { create } from "zustand";
import {
  api,
  AdminStats,
  AdminUser,
  UserCost,
  UserMedia,
  ImageReport,
} from "@/lib/api-client";

interface AdminState {
  stats: AdminStats | null;
  users: AdminUser[];
  usersCost: UserCost[];
  selectedUserMedia: UserMedia[];
  reports: ImageReport[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchStats: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchUsersCost: () => Promise<void>;
  fetchUserMedia: (userId: string) => Promise<void>;
  fetchReports: () => Promise<void>;

  createUser: (data: {
    email: string;
    role?: string;
    daily_limit?: number;
    is_unlimited?: boolean;
  }) => Promise<AdminUser | null>;

  updateUser: (
    userId: string,
    data: {
      daily_limit?: number;
      role?: string;
      is_unlimited?: boolean;
    }
  ) => Promise<AdminUser | null>;

  deleteUser: (userId: string) => Promise<boolean>;
  resetUserQuota: (userId: string) => Promise<AdminUser | null>;

  approveReport: (reportId: string) => Promise<boolean>;
  rejectReport: (reportId: string, note?: string) => Promise<boolean>;

  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  users: [],
  usersCost: [],
  selectedUserMedia: [],
  reports: [],
  isLoading: false,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try {
      const stats = await api.getAdminStats();
      set({ stats, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Error al cargar estadisticas",
        isLoading: false,
      });
    }
  },

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const users = await api.getAdminUsers();
      set({ users, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Error al cargar usuarios",
        isLoading: false,
      });
    }
  },

  fetchUsersCost: async () => {
    set({ isLoading: true, error: null });
    try {
      const usersCost = await api.getUsersCost();
      set({ usersCost, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Error al cargar costos",
        isLoading: false,
      });
    }
  },

  fetchUserMedia: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const media = await api.getUserMedia(userId);
      set({ selectedUserMedia: media, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Error al cargar media del usuario",
        isLoading: false,
      });
    }
  },

  fetchReports: async () => {
    set({ isLoading: true, error: null });
    try {
      const reports = await api.getPendingReports();
      set({ reports, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Error al cargar reportes",
        isLoading: false,
      });
    }
  },

  createUser: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.createAdminUser(data);
      set((state) => ({
        users: [user, ...state.users],
        isLoading: false,
      }));
      return user;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Error al crear usuario",
        isLoading: false,
      });
      return null;
    }
  },

  updateUser: async (userId, data) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.updateAdminUser(userId, data);
      set((state) => ({
        users: state.users.map((u) => (u.id === userId ? user : u)),
        isLoading: false,
      }));
      return user;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Error al actualizar usuario",
        isLoading: false,
      });
      return null;
    }
  },

  deleteUser: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      await api.deleteAdminUser(userId);
      set((state) => ({
        users: state.users.filter((u) => u.id !== userId),
        isLoading: false,
      }));
      return true;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Error al eliminar usuario",
        isLoading: false,
      });
      return false;
    }
  },

  resetUserQuota: async (userId) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.resetUserQuota(userId);
      set((state) => ({
        users: state.users.map((u) => (u.id === userId ? user : u)),
        isLoading: false,
      }));
      return user;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Error al resetear cuota",
        isLoading: false,
      });
      return null;
    }
  },

  approveReport: async (reportId) => {
    set({ isLoading: true, error: null });
    try {
      await api.approveReport(reportId);
      set((state) => ({
        reports: state.reports.filter((r) => r.id !== reportId),
        isLoading: false,
      }));
      return true;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Error al aprobar reporte",
        isLoading: false,
      });
      return false;
    }
  },

  rejectReport: async (reportId, note) => {
    set({ isLoading: true, error: null });
    try {
      await api.rejectReport(reportId, note);
      set((state) => ({
        reports: state.reports.filter((r) => r.id !== reportId),
        isLoading: false,
      }));
      return true;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Error al rechazar reporte",
        isLoading: false,
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
