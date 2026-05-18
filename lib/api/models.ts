import { BaseAPIClient } from './core';
import { API_PREFIX_VENDOR } from './config';
import { CreateModelRequestData, ModelCreationRequest, ModelProfile } from './types';

export const createModelsApi = (client: BaseAPIClient) => ({
  // =====================
  // Rutas del Estudio (vendor-service)
  // =====================
  async requestModelCreation(data: CreateModelRequestData): Promise<ModelCreationRequest> {
    return client.request<ModelCreationRequest>('/request-creation', { 
      method: 'POST', 
      body: JSON.stringify(data),
    }, API_PREFIX_VENDOR);
  },

  async getMyModelRequests(): Promise<ModelCreationRequest[]> {
    return client.request<ModelCreationRequest[]>('/my-requests', {}, API_PREFIX_VENDOR);
  },

  async getMyModels(): Promise<ModelProfile[]> {
    return client.request<ModelProfile[]>('/my-models', {}, API_PREFIX_VENDOR);
  },

  async toggleModelStatus(profileId: string): Promise<ModelProfile> {
    return client.request<ModelProfile>(
      `/profiles/${profileId}/toggle-status`, 
      { method: 'POST' }, 
      API_PREFIX_VENDOR
    );
  },

  // =====================
  // Rutas de Modelo Individual (backend Python - aun no migrado)
  // =====================
  async getMyProfile(): Promise<ModelProfile> {
    return client.request<ModelProfile>('/models/my-profile');
  },

  async updateMyProfile(data: { display_name: string; bio?: string }): Promise<ModelProfile> {
    return client.request<ModelProfile>('/models/my-profile', { 
      method: 'PUT', 
      body: JSON.stringify(data),
    });
  },

  // =====================
  // Rutas de Admin (backend Python - aun no migrado)
  // =====================
  async getPendingModelRequests(): Promise<ModelCreationRequest[]> {
    return client.request<ModelCreationRequest[]>('/models/pending-requests');
  },

  async approveModelRequest(requestId: string): Promise<{ message: string; user_id?: string }> {
    return client.request(`/models/requests/${requestId}/approve`, { method: 'POST' });
  },

  async rejectModelRequest(requestId: string, reason: string): Promise<{ message: string }> {
    return client.request(
      `/models/requests/${requestId}/reject?reason=${encodeURIComponent(reason)}`, 
      { method: 'POST' }
    );
  },

  async confirmModelPayment(requestId: string): Promise<{ message: string }> {
    return client.request(`/models/requests/${requestId}/confirm-payment`, { method: 'POST' });
  },

  async getAllModelProfiles(status?: string): Promise<ModelProfile[]> {
    const query = status ? `?status=${status}` : '';
    return client.request<ModelProfile[]>(`/models/all-profiles${query}`);
  },
});
