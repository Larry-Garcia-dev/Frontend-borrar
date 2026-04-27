import { BaseAPIClient } from './core';
import { API_BASE_URL, API_PREFIX } from './config';
import { GenerationRequest, GenerationTaskResponse, TaskStatusResponse, GeneratedMedia, PromptTemplate, ImageReport } from './types';

export const createGenerationApi = (client: BaseAPIClient) => {
  const apiMethods = {
    async createGeneration(data: GenerationRequest): Promise<GenerationTaskResponse> {
      return client.request<GenerationTaskResponse>("/generation/", { method: "POST", body: JSON.stringify(data) });
    },
    async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
      return client.request<TaskStatusResponse>(`/generation/${taskId}`);
    },
    async getGenerations(): Promise<GeneratedMedia[]> {
      return client.request<GeneratedMedia[]>("/generation/");
    },
    async getPromptTemplates(): Promise<PromptTemplate[]> {
      return client.request<PromptTemplate[]>("/generation/prompt-templates");
    },
    async reportMedia(mediaId: string, reason: string): Promise<ImageReport> {
      return client.request<ImageReport>(`/generation/${mediaId}/report`, { method: "POST", body: JSON.stringify({ reason }) });
    },
    async uploadReferenceImages(files: File[]): Promise<{ urls: string[] }> {
      const formData = new FormData();
      files.forEach((file) => formData.append("files", file));
      const headers: HeadersInit = {};
      const token = client.getToken();
      if (token) headers["Authorization"] = `Bearer ${token}`;
      
      const response = await fetch(`${API_BASE_URL}${API_PREFIX}/generation/reference-images`, {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `Error: ${response.status}`);
      }
      return response.json();
    },
    async waitForGeneration(taskId: string, onProgress?: (status: string, detail: string) => void, maxAttempts = 120, intervalMs = 2000): Promise<GeneratedMedia | null> {
      let attempts = 0;
      while (attempts < maxAttempts) {
        const status = await apiMethods.getTaskStatus(taskId);
        if (onProgress) onProgress(status.status, status.detail);
        
        if (status.status === "success") {
          const media = await apiMethods.getGenerations();
          return media.length > 0 ? media[0] : null;
        }
        if (status.status === "failure") {
          throw new Error(status.detail || "Error en la generacion");
        }
        await new Promise((resolve) => setTimeout(resolve, intervalMs));
        attempts++;
      }
      throw new Error("Tiempo de espera agotado para la generacion");
    },
    async generateImage(data: GenerationRequest): Promise<GeneratedMedia> {
      const task = await apiMethods.createGeneration(data);
      const result = await apiMethods.waitForGeneration(task.task_id);
      if (!result) throw new Error("No se pudo obtener el resultado de la generacion");
      return result;
    },
    async approveMedia(mediaId: string): Promise<{ detail: string }> {
      return client.request<{ detail: string }>(`/generation/${mediaId}/approve`, { method: "POST" });
    }
  };
  return apiMethods;
};