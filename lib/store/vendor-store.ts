import { create } from "zustand";
import { api, VendorUser } from "@/lib/api-client";

interface VendorState {
  users: VendorUser[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchUsers: () => Promise<void>;

  createUser: (data: {
    email: string;
    name?: string;
    daily_limit?: number;
  }) => Promise<VendorUser | null>;

  updateUser: (
    userId: string,
    data: { daily_limit: number }
  ) => Promise<VendorUser | null>;

  deleteUser: (userId: string) => Promise<boolean>;

  clearError: () => void;
}

export const useVendorStore = create<VendorState>((set, get) => ({
  users: [],
  isLoading: false,
  error: null,

  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      const users = await api.getVendorUsers();
      set({ users, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Error al cargar usuarios",
        isLoading: false,
      });
    }
  },

  createUser: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const user = await api.createVendorUser(data);
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
      const user = await api.updateVendorUser(userId, data);
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
      await api.deleteVendorUser(userId);
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

  clearError: () => set({ error: null }),
}));
