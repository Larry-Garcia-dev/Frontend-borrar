import { BaseAPIClient } from './core';
import { API_PREFIX_ADMIN } from './config';
// NUEVO: Asegúrate de tener StudioInfo exportado en tu archivo types.ts
import { AdminStats, AdminUser, UserCost, UserMedia, ImageReport, PromptTemplate, SystemPrompt, StudioInfo } from './types';

export const createAdminApi = (client: BaseAPIClient) => ({
  async getAdminStats(): Promise<AdminStats> {
    return client.request<AdminStats>("/stats", {}, API_PREFIX_ADMIN);
  },
  async getAdminUsers(): Promise<AdminUser[]> {
    return client.request<AdminUser[]>("/users", {}, API_PREFIX_ADMIN);
  },
  async createAdminUser(data: { email: string; role?: string; daily_limit?: number; is_unlimited?: boolean }): Promise<AdminUser> {
    return client.request<AdminUser>("/users", { method: "POST", body: JSON.stringify(data) }, API_PREFIX_ADMIN);
  },
  async updateAdminUser(userId: string, data: { daily_limit?: number; role?: string; is_unlimited?: boolean }): Promise<AdminUser> {
    return client.request<AdminUser>(`/users/${userId}`, { method: "PATCH", body: JSON.stringify(data) }, API_PREFIX_ADMIN);
  },
  async deleteAdminUser(userId: string): Promise<void> {
    await client.request(`/users/${userId}`, { method: "DELETE" }, API_PREFIX_ADMIN);
  },
  async resetUserQuota(userId: string): Promise<AdminUser> {
    return client.request<AdminUser>(`/users/${userId}/reset-quota`, { method: "POST" }, API_PREFIX_ADMIN);
  },
  async getUsersCost(): Promise<UserCost[]> {
    return client.request<UserCost[]>("/users-cost", {}, API_PREFIX_ADMIN);
  },
  async getUserMedia(userId: string): Promise<UserMedia[]> {
    return client.request<UserMedia[]>(`/users/${userId}/media`, {}, API_PREFIX_ADMIN);
  },
  async getPendingReports(): Promise<ImageReport[]> {
    return client.request<ImageReport[]>("/reports", {}, API_PREFIX_ADMIN);
  },
  async approveReport(reportId: string): Promise<{ detail: string }> {
    return client.request<{ detail: string }>(`/reports/${reportId}/approve`, { method: "POST" }, API_PREFIX_ADMIN);
  },
  async rejectReport(reportId: string, adminNote?: string): Promise<{ detail: string }> {
    return client.request<{ detail: string }>(`/reports/${reportId}/reject`, { method: "POST", body: JSON.stringify({ admin_note: adminNote }) }, API_PREFIX_ADMIN);
  },
  
  // ============================================
  // NUEVO: Funcionalidad para obtener info del Estudio
  // ============================================
  async getStudios(): Promise<StudioInfo[]> {
    return client.request<StudioInfo[]>("/studios", {}, API_PREFIX_ADMIN);
  },

  async getStudioInfo(studioId: string): Promise<StudioInfo> {
    return client.request<StudioInfo>(`/studios/${studioId}`, {}, API_PREFIX_ADMIN);
  },

  // ============================================
  // Funcionalidades Prompt Templates Admin
  // ============================================
  async getAdminPromptTemplates(): Promise<PromptTemplate[]> {
    return client.request<PromptTemplate[]>("/prompt-templates/", {}, API_PREFIX_ADMIN);
  },
  async createPromptTemplate(data: { name: string; content: string; description?: string; sort_order: number; created_by: string }): Promise<PromptTemplate> {
    return client.request<PromptTemplate>("/prompt-templates/", { method: "POST", body: JSON.stringify(data) }, API_PREFIX_ADMIN);
  },
  async togglePromptTemplateActive(templateId: string, isActive: boolean): Promise<PromptTemplate> {
    return client.request<PromptTemplate>(`/prompt-templates/${templateId}`, { method: "PATCH", body: JSON.stringify({ is_active: isActive }) }, API_PREFIX_ADMIN);
  },
  async deletePromptTemplate(templateId: string): Promise<void> {
    await client.request(`/prompt-templates/${templateId}`, { method: "DELETE" }, API_PREFIX_ADMIN);
  },

  // ============================================
  // System Prompts (Prompt Base)
  // ============================================
  async getAdminSystemPrompts(): Promise<SystemPrompt[]> {
    return client.request<SystemPrompt[]>("/prompts/", {}, API_PREFIX_ADMIN);
  },
  async createSystemPrompt(data: { name: string; content: string; created_by: string }): Promise<SystemPrompt> {
    return client.request<SystemPrompt>("/prompts/", { method: "POST", body: JSON.stringify(data) }, API_PREFIX_ADMIN);
  },
  async activateSystemPrompt(promptId: string): Promise<SystemPrompt> {
    return client.request<SystemPrompt>(`/prompts/${promptId}/activate`, { method: "POST" }, API_PREFIX_ADMIN);
  },
  async deleteSystemPrompt(promptId: string): Promise<void> {
    await client.request(`/prompts/${promptId}`, { method: "DELETE" }, API_PREFIX_ADMIN);
  },
});