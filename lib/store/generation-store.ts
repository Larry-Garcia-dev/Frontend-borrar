import { create } from "zustand";
import {
  api,
  GeneratedMedia,
  GenerationRequest,
  PromptTemplate,
} from "@/lib/api-client";

interface GenerationState {
  generations: GeneratedMedia[];
  currentGeneration: GeneratedMedia | null;
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
  progress: number;
  taskStatus: string;
  taskId: string | null;
  promptTemplates: PromptTemplate[];

  // Form state
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  mediaType: string;
  referenceImageUrls: string[];
  numImages: number;
  model: string;
  templateId: string | null;
  parentMediaId: string | null;
  steps: number;
  guidance: number;
  seed: number | null;

  // Actions
  setPrompt: (prompt: string) => void;
  setNegativePrompt: (negativePrompt: string) => void;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setMediaType: (mediaType: string) => void;
  setReferenceImageUrls: (urls: string[]) => void;
  setNumImages: (num: number) => void;
  setModel: (model: string) => void;
  setTemplateId: (id: string | null) => void;
  setParentMediaId: (id: string | null) => void;
  setSteps: (steps: number) => void;
  setGuidance: (guidance: number) => void;
  setSeed: (seed: number | null) => void;

  generate: () => Promise<GeneratedMedia | null>;
  fetchGenerations: () => Promise<void>;
  fetchPromptTemplates: () => Promise<void>;
  uploadReferenceImages: (files: File[]) => Promise<string[]>;
  clearError: () => void;
  resetForm: () => void;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  generations: [],
  currentGeneration: null,
  isGenerating: false,
  isLoading: false,
  error: null,
  progress: 0,
  taskStatus: "",
  taskId: null,
  promptTemplates: [],

  // Form defaults
  prompt: "",
  negativePrompt: "",
  width: 1024,
  height: 1024,
  mediaType: "image",
  referenceImageUrls: [],
  numImages: 1,
  model: "qwen-image-2.0-pro",
  templateId: null,
  parentMediaId: null,
  steps: 30,
  guidance: 7.5,
  seed: null,

  setPrompt: (prompt) => set({ prompt }),
  setNegativePrompt: (negativePrompt) => set({ negativePrompt }),
  setWidth: (width) => set({ width }),
  setHeight: (height) => set({ height }),
  setMediaType: (mediaType) => set({ mediaType }),
  setReferenceImageUrls: (urls) => set({ referenceImageUrls: urls }),
  setNumImages: (num) => set({ numImages: num }),
  setModel: (model) => set({ model }),
  setTemplateId: (id) => set({ templateId: id }),
  setParentMediaId: (id) => set({ parentMediaId: id }),
  setSteps: (steps) => set({ steps }),
  setGuidance: (guidance) => set({ guidance }),
  setSeed: (seed) => set({ seed }),

  generate: async () => {
    const state = get();
    if (!state.prompt.trim()) {
      set({ error: "Por favor, ingresa un prompt" });
      return null;
    }

    set({
      isGenerating: true,
      error: null,
      progress: 0,
      taskStatus: "queued",
      currentGeneration: null,
    });

    try {
      const request: GenerationRequest = {
        prompt: state.prompt,
        negative_prompt: state.negativePrompt || undefined,
        width: state.width,
        height: state.height,
        media_type: state.mediaType,
        reference_image_urls:
          state.referenceImageUrls.length > 0
            ? state.referenceImageUrls
            : undefined,
        num_images: state.numImages,
        model: state.model,
        template_id: state.templateId || undefined,
        parent_media_id: state.parentMediaId || undefined,
      };

      // Crear la tarea de generacion
      const task = await api.createGeneration(request);
      set({ taskId: task.task_id, taskStatus: task.status });

      // Hacer polling hasta que termine
      const result = await api.waitForGeneration(
        task.task_id,
        (status, detail) => {
          set({ taskStatus: status });
          // Incrementar progreso basado en status
          if (status === "pending" || status === "queued") {
            set({ progress: 10 });
          } else if (status === "started") {
            set({ progress: 30 });
          } else if (status === "progress") {
            set((s) => ({ progress: Math.min(s.progress + 10, 90) }));
          }
        }
      );

      if (result) {
        set({
          currentGeneration: result,
          generations: [result, ...get().generations],
          isGenerating: false,
          progress: 100,
          taskStatus: "success",
        });
        return result;
      }

      set({ isGenerating: false, progress: 0, taskStatus: "" });
      return null;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Error al generar imagen",
        isGenerating: false,
        progress: 0,
        taskStatus: "failure",
      });
      return null;
    }
  },

  fetchGenerations: async () => {
    set({ isLoading: true, error: null });
    try {
      const generations = await api.getGenerations();
      set({ generations, isLoading: false });
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Error al cargar imagenes",
        isLoading: false,
      });
    }
  },

  fetchPromptTemplates: async () => {
    try {
      const templates = await api.getPromptTemplates();
      set({ promptTemplates: templates });
    } catch {
      // Silently fail, templates are optional
    }
  },

  uploadReferenceImages: async (files: File[]) => {
    try {
      const response = await api.uploadReferenceImages(files);
      const newUrls = [...get().referenceImageUrls, ...response.urls];
      set({ referenceImageUrls: newUrls });
      return response.urls;
    } catch (error) {
      set({
        error:
          error instanceof Error
            ? error.message
            : "Error al subir imagenes de referencia",
      });
      return [];
    }
  },

  clearError: () => set({ error: null }),

  resetForm: () =>
    set({
      prompt: "",
      negativePrompt: "",
      width: 1024,
      height: 1024,
      mediaType: "image",
      referenceImageUrls: [],
      numImages: 1,
      model: "qwen-image-2.0-pro",
      templateId: null,
      parentMediaId: null,
      steps: 30,
      guidance: 7.5,
      seed: null,
      currentGeneration: null,
      progress: 0,
      taskStatus: "",
      taskId: null,
    }),
}));
