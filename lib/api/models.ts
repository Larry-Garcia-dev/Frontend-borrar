import { BaseAPIClient } from './core';
import { API_BASE_URL, API_PREFIX, API_PREFIX_VENDOR } from './config'; // <--- Asegurar importar API_PREFIX_VENDOR
import { CreateModelRequestData, ModelCreationRequest, ModelProfile } from './types';




export const createModelsApi = (client: BaseAPIClient) => ({
  async requestModelCreation(data: CreateModelRequestData): Promise<ModelCreationRequest> {
    return client.request<ModelCreationRequest>("/request-creation", { method: "POST", body: JSON.stringify(data) }, API_PREFIX_VENDOR);
  },


  async getMyModelRequests(): Promise<ModelCreationRequest[]> {
    // Apuntar al endpoint de Node.js (Puerto 4002)
    return client.request<ModelCreationRequest[]>("/my-requests", {}, API_PREFIX_VENDOR);
  },


 async getMyModels(): Promise<ModelProfile[]> {
    // Apuntar al endpoint de Node.js (Puerto 4002)
    return client.request<ModelProfile[]>("/my-models", {}, API_PREFIX_VENDOR);
  },


  async getMyProfile(): Promise<ModelProfile> {
    return client.request<ModelProfile>("/models/my-profile");
  },


  async updateMyProfile(data: { display_name: string; bio?: string }): Promise<ModelProfile> {
    return client.request<ModelProfile>("/models/my-profile", { method: "PUT", body: JSON.stringify(data) });
  },


  async getPendingModelRequests(): Promise<ModelCreationRequest[]> {
    return client.request<ModelCreationRequest[]>("/models/pending-requests");
  },


  async approveModelRequest(requestId: string): Promise<{ message: string; user_id?: string }> {
    return client.request(`/models/requests/${requestId}/approve`, { method: "POST" });
  },


  async rejectModelRequest(requestId: string, reason: string): Promise<{ message: string }> {
    return client.request(`/models/requests/${requestId}/reject?reason=${encodeURIComponent(reason)}`, { method: "POST" });
  },


  async confirmModelPayment(requestId: string): Promise<{ message: string }> {
    return client.request(`/models/requests/${requestId}/confirm-payment`, { method: "POST" });
  },


  async getAllModelProfiles(status?: string): Promise<ModelProfile[]> {
    const query = status ? `?status=${status}` : "";
    return client.request<ModelProfile[]>(`/models/all-profiles${query}`);
  },


  async toggleModelStatus(profileId: string): Promise<ModelProfile> {
    return client.request<ModelProfile>(`/models/profiles/${profileId}/toggle-status`, { method: "POST" });
  },


  async uploadTrainingPhotos(files: File[], modelEmail?: string): Promise<{ urls: string[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    // Si viene el email, lo agregamos al payload
    if (modelEmail) {
      formData.append("model_email", modelEmail);
    }

    const headers: HeadersInit = {};
    const token = client.getToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const response = await fetch(`${API_BASE_URL}${API_PREFIX}/models/upload-photos`, {
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
  }
});