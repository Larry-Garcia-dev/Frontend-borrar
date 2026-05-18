import { BaseAPIClient } from './core';
import { API_PREFIX_VENDOR } from './config';
import { VendorUser } from './types';

export const createVendorApi = (client: BaseAPIClient) => ({
    async getVendorUsers(): Promise<VendorUser[]> {
    return client.request<VendorUser[]>("/users", {}, API_PREFIX_VENDOR);
  },
  async getModelsForSelect(): Promise<any[]> {
    return client.request<any[]>("/my-models-select", {}, API_PREFIX_VENDOR);
  },
  async createVendorUser(data: { email: string; name?: string; daily_limit?: number }): Promise<VendorUser> {
    return client.request<VendorUser>("/users", { method: "POST", body: JSON.stringify(data) }, API_PREFIX_VENDOR);
  },
  async updateVendorUser(userId: string, data: { daily_limit: number }): Promise<VendorUser> {
    return client.request<VendorUser>(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(data) }, API_PREFIX_VENDOR);
  },
  async deleteVendorUser(userId: string): Promise<void> {
    await client.request(`/users/${userId}`, { method: "DELETE" }, API_PREFIX_VENDOR);
  },
  async triggerGenerationFromStudio(data: { model_user_id: string, prompt: string, is_explicit?: boolean }): Promise<any> {
    return client.request<any>("/generate-for-model", { 
      method: "POST", 
      body: JSON.stringify(data) 
    }, API_PREFIX_VENDOR);
  }
});