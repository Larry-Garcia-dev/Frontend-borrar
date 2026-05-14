import { create } from "zustand";
import {
  api,
  GeneratedMedia,
  GenerationRequest,
  PromptTemplate,
  resolveMediaUrl,
  ExplicitGenerationRequest,
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
  parentEditCount: number;
  selectedSize: string;
  isExplicitMode: boolean;

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
  setParentEditCount: (count: number) => void;
  setSelectedSize: (size: string) => void;
  setIsExplicitMode: (mode: boolean) => void;
  startEdit: (mediaId: string, editCount: number) => void;
  cancelEdit: () => void;
  reportMedia: (mediaId: string, reason: string) => Promise<void>;
  approveMedia: (mediaId: string) => Promise<void>;
  generateEdit: (mediaId: string, hiddenPrompt: string, negativePrompt: string, clothingText: string, width: number, height: number) => Promise<GeneratedMedia | null>;

  generate: () => Promise<GeneratedMedia | null>;
  generateExplicit: (data: ExplicitGenerationRequest) => Promise<GeneratedMedia | null>;
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
  parentEditCount: 0,
  selectedSize: "1080x1080 (1:1)",
  isExplicitMode: false,

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
  setParentEditCount: (count) => set({ parentEditCount: count }),
  setSelectedSize: (size) => set({ selectedSize: size }),
  setIsExplicitMode: (mode) => set({ isExplicitMode: mode }),
  startEdit: (mediaId, editCount) => set({ parentMediaId: mediaId, parentEditCount: editCount }),
  cancelEdit: () => set({ parentMediaId: null, parentEditCount: 0 }),
  reportMedia: async (mediaId, reason) => {
    await api.reportMedia(mediaId, reason);
  },

  // Generar edición con prompt oculto (el usuario no ve el prompt interno)
  generateEdit: async (mediaId: string, hiddenPrompt: string, negativePrompt: string, clothingText: string, width: number, height: number) => {
    const state = get();
    const media = state.generations.find(g => g.id === mediaId) || state.currentGeneration;
    
    if (!media) {
      set({ error: "No se encontró la imagen para editar" });
      return null;
    }

    // Verificar límite de ediciones (máximo 2)
    if ((media.edit_count || 0) >= 2) {
      set({ error: "Has alcanzado el límite de ediciones para esta imagen" });
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
      // Construir prompt combinado (oculto para el usuario)
      let fullPrompt = `Edit image based on: ${media.prompt}`;
      
      if (hiddenPrompt) {
        fullPrompt += `. ${hiddenPrompt}`;
      }
      
      if (clothingText.trim()) {
        fullPrompt += `. Change clothing to: ${clothingText.trim()}`;
      }

      const request: GenerationRequest = {
        prompt: fullPrompt,
        negative_prompt: negativePrompt || undefined,
        width,
        height,
        media_type: "image",
        parent_media_id: mediaId,
      };

      const task = await api.createGeneration(request);
      set({ taskId: task.task_id, taskStatus: task.status });

      const result = await api.waitForGeneration(
        task.task_id,
        (status) => {
          set({ taskStatus: status });
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
        const resolvedResult = {
          ...result,
          storage_url: resolveMediaUrl(result.storage_url),
        };
        set({
          currentGeneration: resolvedResult,
          generations: [resolvedResult, ...get().generations],
          isGenerating: false,
          progress: 100,
          taskStatus: "success",
          parentMediaId: null,
          parentEditCount: 0,
        });
        return resolvedResult;
      }

      set({ isGenerating: false, progress: 0, taskStatus: "" });
      return null;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Error al generar edición",
        isGenerating: false,
        progress: 0,
        taskStatus: "failure",
      });
      return null;
    }
  },

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
        // Resolver URL de media
        const resolvedResult = {
          ...result,
          storage_url: resolveMediaUrl(result.storage_url),
        };
        set({
          currentGeneration: resolvedResult,
          generations: [resolvedResult, ...get().generations],
          isGenerating: false,
          progress: 100,
          taskStatus: "success",
          parentMediaId: null,
          parentEditCount: 0,
        });
        return resolvedResult;
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

  generateExplicit: async (data: ExplicitGenerationRequest) => {
    set({
      isGenerating: true,
      error: null,
      progress: 0,
      taskStatus: "queued",
      currentGeneration: null,
    });

    try {
      // Crear la tarea de generación explícita
      const task = await api.createExplicitGeneration(data);
      set({ taskId: task.task_id, taskStatus: task.status, progress: 10 });

      // Hacer polling hasta que termine
      const result = await api.waitForGeneration(
        task.task_id,
        (status, detail) => {
          set({ taskStatus: status });
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
        const resolvedResult = {
          ...result,
          storage_url: resolveMediaUrl(result.storage_url),
        };
        set({
          currentGeneration: resolvedResult,
          generations: [resolvedResult, ...get().generations],
          isGenerating: false,
          progress: 100,
          taskStatus: "success",
        });
        return resolvedResult;
      }

      set({ isGenerating: false, progress: 0, taskStatus: "" });
      return null;
    } catch (error) {
      set({
        error:
          error instanceof Error ? error.message : "Error al generar imagen explícita",
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
      // Resolver URLs de media
      const resolvedGenerations = generations.map((g) => ({
        ...g,
        storage_url: resolveMediaUrl(g.storage_url),
      }));
      set({ generations: resolvedGenerations, isLoading: false });
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
  approveMedia: async (mediaId) => {
  try {
    await api.approveMedia(mediaId); // Persiste en la DB
    set((state) => ({
      // Actualiza la galería para que el cambio se vea al navegar
      generations: state.generations.map((g) => 
        g.id === mediaId ? { ...g, is_approved: true } : g
      ),
      // Sincroniza con la vista de generación actual
      currentGeneration: state.currentGeneration?.id === mediaId 
        ? { ...state.currentGeneration, is_approved: true } 
        : state.currentGeneration
    }));
  } catch (error) {
    console.error("Error al aprobar media:", error);
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
      parentEditCount: 0,
      selectedSize: "1080x1080 (1:1)",
      currentGeneration: null,
      progress: 0,
      taskStatus: "",
      taskId: null,
    }),
    
}));
