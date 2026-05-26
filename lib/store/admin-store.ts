import { create } from "zustand";
import {
  api,
  AdminStats,
  AdminUser,
  UserCost,
  UserMedia,
  ImageReport,
  ModelCreationRequest,
  StudioInfo,
} from "@/lib/api-client";

interface AdminState {
  stats: AdminStats | null;
  users: AdminUser[];
  usersCost: UserCost[];
  selectedUserMedia: UserMedia[];
  reports: ImageReport[];
  modelRequests: ModelCreationRequest[];
  
  // Estados para los estudios
  studios: StudioInfo[];
  studioInfo: StudioInfo | null;
  isLoadingStudios: boolean;
  isLoadingStudio: boolean;
  
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchStats: () => Promise<void>;
  fetchUsers: () => Promise<void>;
  fetchUsersCost: () => Promise<void>;
  fetchUserMedia: (userId: string) => Promise<void>;
  fetchReports: () => Promise<void>;
  fetchModelRequests: () => Promise<void>;

  // Actions para estudios
  fetchStudios: () => Promise<void>;
  fetchStudioInfo: (studioId: string) => Promise<void>;
  clearStudioInfo: () => void;

  createUser: (data: { email: string; role?: string; daily_limit?: number; is_unlimited?: boolean }) => Promise<AdminUser | null>;
  updateUser: (userId: string, data: { daily_limit?: number; role?: string; is_unlimited?: boolean; max_models_limit?: number }) => Promise<AdminUser | null>;
  deleteUser: (userId: string) => Promise<boolean>;
  resetUserQuota: (userId: string) => Promise<AdminUser | null>;

  approveReport: (reportId: string) => Promise<boolean>;
  rejectReport: (reportId: string, note?: string) => Promise<boolean>;

  approveModelRequest: (requestId: string) => Promise<boolean>;
  rejectModelRequest: (requestId: string, reason: string) => Promise<boolean>;
  confirmModelPayment: (requestId: string) => Promise<boolean>;

  clearError: () => void;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  stats: null,
  users: [],
  usersCost: [],
  selectedUserMedia: [],
  reports: [],
  modelRequests: [],
  
  // Estados iniciales para estudios
  studios: [],
  studioInfo: null,
  isLoadingStudios: false,
  isLoadingStudio: false,
  
  isLoading: false,
  error: null,

  fetchStats: async () => {
    set({ isLoading: true, error: null });
    try { const stats = await api.getAdminStats(); set({ stats, isLoading: false }); } 
    catch (e: any) { set({ error: e.message, isLoading: false }); }
  },

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try { const users = await api.getAdminUsers(); set({ users, isLoading: false }); } 
    catch (e: any) { set({ error: e.message, isLoading: false }); }
  },

  fetchUsersCost: async () => {
    set({ isLoading: true, error: null });
    try { const usersCost = await api.getUsersCost(); set({ usersCost, isLoading: false }); } 
    catch (e: any) { set({ error: e.message, isLoading: false }); }
  },

  fetchUserMedia: async (userId: string) => {
    set({ isLoading: true, error: null });
    try { const selectedUserMedia = await api.getUserMedia(userId); set({ selectedUserMedia, isLoading: false }); } 
    catch (e: any) { set({ error: e.message, isLoading: false }); }
  },

  fetchReports: async () => {
    set({ isLoading: true, error: null });
    try { const reports = await api.getPendingReports(); set({ reports, isLoading: false }); } 
    catch (e: any) { set({ error: e.message, isLoading: false }); }
  },

  fetchModelRequests: async () => {
    set({ isLoading: true, error: null });
    try { const modelRequests = await api.getPendingModelRequests(); set({ modelRequests, isLoading: false }); } 
    catch (e: any) { set({ error: e.message, isLoading: false }); }
  },

  // Función para obtener la lista de todos los estudios
  fetchStudios: async () => {
    set({ isLoadingStudios: true, error: null });
    try {
      const studios = await api.getStudios();
      set({ studios, isLoadingStudios: false });
    } catch (e: any) {
      set({ error: e.message, isLoadingStudios: false, studios: [] });
    }
  },

  // Función para obtener la información de un estudio específico
  fetchStudioInfo: async (studioId: string) => {
    set({ isLoadingStudio: true, error: null });
    try {
      const studioInfo = await api.getStudioInfo(studioId);
      set({ studioInfo, isLoadingStudio: false });
    } catch (e: any) {
      set({ error: e.message, isLoadingStudio: false, studioInfo: null });
    }
  },

  // Función para limpiar la información del estudio
  clearStudioInfo: () => set({ studioInfo: null }),

  createUser: async (data) => {
    set({ isLoading: true, error: null });
    try { const user = await api.createAdminUser(data); set((state) => ({ users: [user, ...state.users], isLoading: false })); return user; } 
    catch (e: any) { set({ error: e.message, isLoading: false }); return null; }
  },

  updateUser: async (userId, data) => {
    set({ isLoading: true, error: null });
    try { const user = await api.updateAdminUser(userId, data); set((state) => ({ users: state.users.map((u) => (u.id === userId ? user : u)), isLoading: false })); return user; } 
    catch (e: any) { set({ error: e.message, isLoading: false }); return null; }
  },

  deleteUser: async (userId) => {
    set({ isLoading: true, error: null });
    try { await api.deleteAdminUser(userId); set((state) => ({ users: state.users.filter((u) => u.id !== userId), isLoading: false })); return true; } 
    catch (e: any) { set({ error: e.message, isLoading: false }); return false; }
  },

  resetUserQuota: async (userId) => {
    set({ isLoading: true, error: null });
    try { const user = await api.resetUserQuota(userId); set((state) => ({ users: state.users.map((u) => (u.id === userId ? user : u)), isLoading: false })); return user; } 
    catch (e: any) { set({ error: e.message, isLoading: false }); return null; }
  },

  approveReport: async (reportId) => {
    set({ isLoading: true, error: null });
    try { await api.approveReport(reportId); set((state) => ({ reports: state.reports.filter((r) => r.id !== reportId), isLoading: false })); return true; } 
    catch (e: any) { set({ error: e.message, isLoading: false }); return false; }
  },

  rejectReport: async (reportId, note) => {
    set({ isLoading: true, error: null });
    try { await api.rejectReport(reportId, note); set((state) => ({ reports: state.reports.filter((r) => r.id !== reportId), isLoading: false })); return true; } 
    catch (e: any) { set({ error: e.message, isLoading: false }); return false; }
  },

  approveModelRequest: async (requestId) => {
    set({ isLoading: true, error: null });
    try { 
      await api.approveModelRequest(requestId); 
      await get().fetchModelRequests(); 
      return true; 
    } 
    catch (e: any) { set({ error: e.message, isLoading: false }); return false; }
  },

  rejectModelRequest: async (requestId, reason) => {
    set({ isLoading: true, error: null });
    try { 
      await api.rejectModelRequest(requestId, reason); 
      set((state) => ({ modelRequests: state.modelRequests.filter((r) => r.id !== requestId), isLoading: false })); 
      return true; 
    } 
    catch (e: any) { set({ error: e.message, isLoading: false }); return false; }
  },

  confirmModelPayment: async (requestId) => {
    set({ isLoading: true, error: null });
    try { 
      await api.confirmModelPayment(requestId); 
      await get().fetchModelRequests(); 
      return true; 
    } 
    catch (e: any) { set({ error: e.message, isLoading: false }); return false; }
  },

  clearError: () => set({ error: null }),
}));