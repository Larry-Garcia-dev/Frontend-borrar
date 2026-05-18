import { StateCreator } from "zustand";
import { GenerationStore, FormSlice } from "./types";
import { api } from "@/lib/api-client";

export const createFormSlice: StateCreator<GenerationStore, [], [], FormSlice> = (set, get) => ({
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
  studioModels: [],
  selectedStudioModelId: null,

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
  setSelectedStudioModelId: (id) => set({ selectedStudioModelId: id }),
  
  fetchStudioModels: async () => {
    try {
      const models = await api.getModelsForSelect();
      set({ studioModels: models });
      if (models.length > 0 && !get().selectedStudioModelId) {
        set({ selectedStudioModelId: models[0].id });
      }
    } catch (e) {
      console.error("Error loading models:", e);
    }
  },

  resetForm: () => set({
    prompt: "", negativePrompt: "", width: 1024, height: 1024, mediaType: "image",
    referenceImageUrls: [], numImages: 1, model: "qwen-image-2.0-pro", templateId: null,
    parentMediaId: null, parentEditCount: 0, selectedSize: "1080x1080 (1:1)",
  })
});