import { StateCreator } from "zustand";
import { GenerationStore, ExecutionSlice } from "./types";
import { api, GenerationRequest, resolveMediaUrl } from "@/lib/api-client";

export const createExecutionSlice: StateCreator<GenerationStore, [], [], ExecutionSlice> = (set, get) => ({
  currentGeneration: null,
  currentGenerations: [],
  isGenerating: false,
  isLoading: false,
  error: null,
  progress: 0,
  taskStatus: "",
  taskId: null,
  clearError: () => set({ error: null }),

  generate: async () => {
    const state = get();
    if (!state.prompt.trim()) { set({ error: "Ingresa un prompt" }); return null; }
    set({ isGenerating: true, error: null, progress: 0, taskStatus: "queued", currentGeneration: null });
    try {
      const req: GenerationRequest = {
        prompt: state.prompt, negative_prompt: state.negativePrompt || undefined,
        width: state.width, height: state.height, media_type: state.mediaType,
        reference_image_urls: state.referenceImageUrls.length > 0 ? state.referenceImageUrls : undefined,
        num_images: state.numImages, model: state.model,
        template_id: state.templateId || undefined, parent_media_id: state.parentMediaId || undefined,
      };
      const task = await api.createGeneration(req);
      set({ taskId: task.task_id, taskStatus: task.status });
      const result = await api.waitForGeneration(task.task_id, (status) => {
        set({ taskStatus: status });
        if (status === "pending" || status === "queued") set({ progress: 10 });
        else if (status === "started") set({ progress: 30 });
        else if (status === "progress") set((s) => ({ progress: Math.min(s.progress + 10, 90) }));
      });
      if (result) {
        const resolved = { ...result, storage_url: resolveMediaUrl(result.storage_url) };
        set({ currentGeneration: resolved, generations: [resolved, ...get().generations], isGenerating: false, progress: 100, taskStatus: "success", parentMediaId: null, parentEditCount: 0 });
        return resolved;
      }
      set({ isGenerating: false, progress: 0, taskStatus: "" }); return null;
    } catch (e: any) { set({ error: e.message, isGenerating: false, progress: 0, taskStatus: "failure" }); return null; }
  },

  generateForModel: async (modelUserId: string) => {
    const state = get();
    if (!state.prompt.trim()) { set({ error: "Ingresa un prompt" }); return null; }
    set({ isGenerating: true, error: null, progress: 0, taskStatus: "queued" });
    try {
      const result = await api.triggerGenerationFromStudio({
        model_user_id: modelUserId,
        prompt: state.prompt,
        is_explicit: state.isExplicitMode,
      });
      set({ isGenerating: false, progress: 100, taskStatus: "success" });
      return result;
    } catch (e: any) { 
      set({ error: e.message, isGenerating: false, progress: 0, taskStatus: "failure" }); 
      return null; 
    }
  },

  generateExplicit: async (data) => {
    set({ isGenerating: true, error: null, progress: 0, taskStatus: "queued", currentGeneration: null, currentGenerations: [] });
    try {
      const task = await api.createExplicitGeneration(data);
      set({ taskId: task.task_id, taskStatus: task.status, progress: 10 });
      const results = await api.waitForMultipleGenerations(task.task_id, 3, (status) => {
        set({ taskStatus: status });
        if (status === "pending" || status === "queued") set({ progress: 10 });
        else if (status === "started") set({ progress: 30 });
        else if (status === "progress") set((s) => ({ progress: Math.min(s.progress + 10, 90) }));
      });
      if (results?.length > 0) {
        const resolved = results.map(r => ({ ...r, storage_url: resolveMediaUrl(r.storage_url) }));
        set({ currentGeneration: resolved[0], currentGenerations: resolved, generations: [...resolved, ...get().generations], isGenerating: false, progress: 100, taskStatus: "success" });
        return resolved[0];
      }
      set({ isGenerating: false, progress: 0, taskStatus: "" }); return null;
    } catch (e: any) { set({ error: e.message, isGenerating: false, progress: 0, taskStatus: "failure" }); return null; }
  },

  generateEdit: async (mediaId, hiddenPrompt, negativePrompt, clothingText, customPrompt, width, height, numImages = 3) => {
    const state = get();
    const media = state.generations.find(g => g.id === mediaId) || state.currentGeneration;
    if (!media || (media.edit_count || 0) >= 2) { set({ error: "No disponible o límite alcanzado" }); return null; }
    set({ isGenerating: true, error: null, progress: 0, taskStatus: "queued", currentGeneration: null, currentGenerations: [] });
    try {
      let fullPrompt = `Edit image based on: ${media.prompt}`;
      if (hiddenPrompt) fullPrompt += `. ${hiddenPrompt}`;
      if (clothingText.trim()) fullPrompt += `. Change clothing to: ${clothingText.trim()}`;
      if (customPrompt.trim()) fullPrompt += `. ${customPrompt.trim()}`;

      const task = await api.createGeneration({ prompt: fullPrompt, negative_prompt: negativePrompt || undefined, width, height, media_type: "image", parent_media_id: mediaId, num_images: numImages });
      set({ taskId: task.task_id, taskStatus: task.status });
      const results = await api.waitForMultipleGenerations(task.task_id, numImages, (status) => {
        set({ taskStatus: status });
        if (status === "pending" || status === "queued") set({ progress: 10 });
        else if (status === "started") set({ progress: 30 });
        else if (status === "progress") set((s) => ({ progress: Math.min(s.progress + 10, 90) }));
      });
      if (results && results.length > 0) {
        const resolved = results.map(r => ({ ...r, storage_url: resolveMediaUrl(r.storage_url) }));
        set({ currentGeneration: resolved[0], currentGenerations: resolved, generations: [...resolved, ...get().generations], isGenerating: false, progress: 100, taskStatus: "success", parentMediaId: null, parentEditCount: 0 });
        return resolved;
      }
      set({ isGenerating: false, progress: 0, taskStatus: "" }); return null;
    } catch (e: any) { set({ error: e.message, isGenerating: false, progress: 0, taskStatus: "failure" }); return null; }
  }
});
