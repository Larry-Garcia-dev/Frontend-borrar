import { StateCreator } from "zustand";
import { GenerationStore, MediaSlice } from "./types";
import { api, resolveMediaUrl } from "@/lib/api-client";

export const createMediaSlice: StateCreator<GenerationStore, [], [], MediaSlice> = (set, get) => ({
  generations: [],
  promptTemplates: [],

  fetchGenerations: async () => {
    set({ isLoading: true, error: null });
    try {
      const generations = await api.getGenerations();
      const resolved = generations.map((g) => ({
        ...g, storage_url: resolveMediaUrl(g.storage_url),
      }));
      set({ generations: resolved, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  fetchPromptTemplates: async () => {
    try {
      const templates = await api.getPromptTemplates();
      set({ promptTemplates: templates });
    } catch (error) { 
      // Silently fail - prompt templates are optional
      console.log("[v0] fetchPromptTemplates: endpoint not available, skipping");
    }
  },

  approveMedia: async (mediaId) => {
    try {
      await api.approveMedia(mediaId);
      set((state) => ({
        generations: state.generations.map((g) => g.id === mediaId ? { ...g, is_approved: true } : g),
        currentGeneration: state.currentGeneration?.id === mediaId 
          ? { ...state.currentGeneration, is_approved: true } : state.currentGeneration
      }));
    } catch (error) { console.error(error); }
  },

  reportMedia: async (mediaId, reason) => {
    await api.reportMedia(mediaId, reason);
  },

  uploadReferenceImages: async (files) => {
    try {
      const response = await api.uploadReferenceImages(files);
      set({ referenceImageUrls: [...get().referenceImageUrls, ...response.urls] });
      return response.urls;
    } catch (error: any) {
      set({ error: error.message });
      return [];
    }
  }
});
