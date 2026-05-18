import { GeneratedMedia, PromptTemplate, ExplicitGenerationRequest } from "@/lib/api-client";

export type GenerationStore = FormSlice & MediaSlice & ExecutionSlice;

export interface FormSlice {
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
  studioModels: any[];
  selectedStudioModelId: string | null;

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
  resetForm: () => void;
  setSelectedStudioModelId: (id: string | null) => void;
  fetchStudioModels: () => Promise<void>;
}

export interface MediaSlice {
  generations: GeneratedMedia[];
  promptTemplates: PromptTemplate[];
  fetchGenerations: () => Promise<void>;
  fetchPromptTemplates: () => Promise<void>;
  approveMedia: (mediaId: string) => Promise<void>;
  reportMedia: (mediaId: string, reason: string) => Promise<void>;
  uploadReferenceImages: (files: File[]) => Promise<string[]>;
}

export interface ExecutionSlice {
  currentGeneration: GeneratedMedia | null;
  currentGenerations: GeneratedMedia[];
  isGenerating: boolean;
  isLoading: boolean;
  error: string | null;
  progress: number;
  taskStatus: string;
  taskId: string | null;
  generate: () => Promise<GeneratedMedia | null>;
  generateExplicit: (data: ExplicitGenerationRequest) => Promise<GeneratedMedia | null>;
  generateEdit: (mediaId: string, hiddenPrompt: string, negativePrompt: string, clothingText: string, customPrompt: string, width: number, height: number, numImages: number) => Promise<GeneratedMedia[] | null>;
  clearError: () => void;
}