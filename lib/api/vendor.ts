import { BaseAPIClient } from './core';
import { API_PREFIX_VENDOR, API_VENDOR_BASE_URL } from './config';
import { VendorUser, ModelProfile, ModelCreationRequest } from './types';

export const createVendorApi = (client: BaseAPIClient) => ({
  // =====================
  // Usuarios del Estudio
  // =====================
  async getVendorUsers(): Promise<VendorUser[]> {
    return client.request<VendorUser[]>('/users', {}, API_PREFIX_VENDOR);
  },

  async createVendorUser(data: { email: string; name?: string; daily_limit?: number }): Promise<VendorUser> {
    return client.request<VendorUser>('/users', { method: 'POST', body: JSON.stringify(data) }, API_PREFIX_VENDOR);
  },

  async updateVendorUser(userId: string, data: { daily_limit: number }): Promise<VendorUser> {
    return client.request<VendorUser>(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) }, API_PREFIX_VENDOR);
  },

  async deleteVendorUser(userId: string): Promise<void> {
    await client.request(`/users/${userId}`, { method: 'DELETE' }, API_PREFIX_VENDOR);
  },

  // =====================
  // Modelos para Selector (solo activos)
  // =====================
  async getModelsForSelect(): Promise<{ id: string; user_id: string; display_name: string }[]> {
    return client.request('/my-models-select', {}, API_PREFIX_VENDOR);
  },

  // =====================
  // Modelos y Solicitudes combinados
  // =====================
  async getMyModelsAndRequests(): Promise<{ requests: ModelCreationRequest[]; profiles: ModelProfile[] }> {
    return client.request('/my-models-and-requests', {}, API_PREFIX_VENDOR);
  },

  // =====================
  // Generacion de Imagenes
  // =====================
  async triggerGenerationFromStudio(data: { 
    model_user_id: string; 
    prompt: string; 
    is_explicit?: boolean;
    num_images?: number;
    width?: number;
    height?: number;
  }): Promise<any> {
    console.log("[v0] triggerGenerationFromStudio called");
    console.log("[v0] API_VENDOR_BASE_URL:", API_VENDOR_BASE_URL);
    console.log("[v0] API_PREFIX_VENDOR:", API_PREFIX_VENDOR);
    console.log("[v0] Data:", JSON.stringify(data));
    
    try {
      const result = await client.request<any>('/generate-for-model', { 
        method: 'POST', 
        body: JSON.stringify(data),
      }, API_PREFIX_VENDOR);
      console.log("[v0] API response:", result);
      return result;
    } catch (error: any) {
      console.error("[v0] API error:", error);
      throw error;
    }
  },

  // =====================
  // Upload de Fotos
  // =====================
  async uploadTrainingPhotos(files: File[], modelEmail?: string): Promise<{ urls: string[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    if (modelEmail) formData.append('model_email', modelEmail);

    const headers: HeadersInit = {};
    const token = client.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const response = await fetch(`${API_VENDOR_BASE_URL}${API_PREFIX_VENDOR}/upload-photos`, {
      method: 'POST',
      headers,
      body: formData,
      credentials: 'include',
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Error: ${response.status}`);
    }
    return response.json();
  },
});
