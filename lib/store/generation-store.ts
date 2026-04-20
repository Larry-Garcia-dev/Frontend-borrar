import { create } from "zustand";
import { api, GeneratedImage, GenerationRequest } from "@/lib/api-client";

interface GenerationState {
  generations: GeneratedImage[];
  currentGeneration: GeneratedImage | null;
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
  progress: number;
  
  // Form state
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  steps: number;
  guidance: number;
  seed: number | null;

  // Actions
  setPrompt: (prompt: string) => void;
  setNegativePrompt: (negativePrompt: string) => void;
  setWidth: (width: number) => void;
  setHeight: (height: number) => void;
  setSteps: (steps: number) => void;
  setGuidance: (guidance: number) => void;
  setSeed: (seed: number | null) => void;
  
  generate: () => Promise<void>;
  fetchGenerations: () => Promise<void>;
  deleteGeneration: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useGenerationStore = create<GenerationState>((set, get) => ({
  generations: [],
  currentGeneration: null,
  isGenerating: false,
  isLoading: false,
  error: null,
  progress: 0,

  // Form defaults
  prompt: "",
  negativePrompt: "",
  width: 1024,
  height: 1024,
  steps: 30,
  guidance: 7.5,
  seed: null,

  setPrompt: (prompt) => set({ prompt }),
  setNegativePrompt: (negativePrompt) => set({ negativePrompt }),
  setWidth: (width) => set({ width }),
  setHeight: (height) => set({ height }),
  setSteps: (steps) => set({ steps }),
  setGuidance: (guidance) => set({ guidance }),
  setSeed: (seed) => set({ seed }),

  generate: async () => {
    const state = get();
    if (!state.prompt.trim()) {
      set({ error: "Por favor, ingresa un prompt" });
      return;
    }

    set({ isGenerating: true, error: null, progress: 0, currentGeneration: null });

    // Simulate progress
    const progressInterval = setInterval(() => {
      set((s) => ({ progress: Math.min(s.progress + Math.random() * 15, 90) }));
    }, 500);

    try {
      const request: GenerationRequest = {
        prompt: state.prompt,
        negative_prompt: state.negativePrompt || undefined,
        width: state.width,
        height: state.height,
        num_inference_steps: state.steps,
        guidance_scale: state.guidance,
        seed: state.seed || undefined,
      };

      const result = await api.generateImage(request);
      
      clearInterval(progressInterval);
      set({ 
        currentGeneration: result,
        generations: [result, ...state.generations],
        isGenerating: false,
        progress: 100 
      });
    } catch (error) {
      clearInterval(progressInterval);
      set({ 
        error: error instanceof Error ? error.message : "Error al generar imagen",
        isGenerating: false,
        progress: 0
      });
    }
  },

  fetchGenerations: async () => {
    set({ isLoading: true });
    try {
      const generations = await api.getGenerations();
      set({ generations, isLoading: false });
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Error al cargar imagenes",
        isLoading: false 
      });
    }
  },

  deleteGeneration: async (id) => {
    try {
      await api.deleteGeneration(id);
      set((state) => ({
        generations: state.generations.filter((g) => g.id !== id),
        currentGeneration: state.currentGeneration?.id === id ? null : state.currentGeneration
      }));
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : "Error al eliminar imagen" 
      });
    }
  },

  clearError: () => set({ error: null }),
}));
