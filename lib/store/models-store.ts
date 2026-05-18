import { create } from "zustand";
import { api, ModelProfile, ModelCreationRequest } from "@/lib/api-client";

interface ModelsState {
  models: ModelProfile[];
  requests: ModelCreationRequest[];
  modelsForSelect: { id: string; user_id: string; display_name: string }[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchModels: () => Promise<void>;
  fetchRequests: () => Promise<void>;
  fetchModelsForSelect: () => Promise<void>;
  toggleStatus: (profileId: string) => Promise<boolean>;
  clearError: () => void;
}

export const useModelsStore = create<ModelsState>((set) => ({
  models: [],
  requests: [],
  modelsForSelect: [],
  isLoading: false,
  error: null,

  fetchModels: async () => {
    set({ isLoading: true, error: null });
    try {
      const models = await api.getMyModels();
      set({ models, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar modelos",
        isLoading: false,
      });
    }
  },

  fetchRequests: async () => {
    set({ isLoading: true, error: null });
    try {
      const requests = await api.getMyModelRequests();
      set({ requests, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cargar solicitudes",
        isLoading: false,
      });
    }
  },

  fetchModelsForSelect: async () => {
    try {
      const modelsForSelect = await api.getModelsForSelect();
      set({ modelsForSelect });
    } catch (error) {
      console.error("[v0] Error fetching models for select:", error);
    }
  },

  toggleStatus: async (profileId) => {
    set({ isLoading: true, error: null });
    try {
      await api.toggleModelStatus(profileId);
      const models = await api.getMyModels();
      set({ models, isLoading: false });
      return true;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al cambiar estado",
        isLoading: false,
      });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
