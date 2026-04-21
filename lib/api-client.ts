// API Client for Macondo AI Backend
// Configure this URL to match your backend deployment

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1";
const API_PREFIX_ADMIN = "/api/admin"; // Admin usa /api/admin (sin v1)
const API_PREFIX_VENDOR = "/api/vendor"; // Vendor usa /api/vendor (sin v1)

// Helper para resolver URLs de media
export function resolveMediaUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
}

// Types
export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  daily_limit: number;
  used_quota: number;
  is_unlimited: boolean;
  vendor_id?: string;
  quota_reset_at?: string;
}

export interface GenerationRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  media_type?: string;
  reference_image_url?: string;
  reference_image_urls?: string[];
  num_images?: number;
  model?: string;
  template_id?: string;
  parent_media_id?: string;
}

// Respuesta de crear generacion (tarea en cola)
export interface GenerationTaskResponse {
  task_id: string;
  status: string;
  detail: string;
}

// Estado de una tarea de generacion
export interface TaskStatusResponse {
  task_id: string;
  status: string;
  detail: string;
}

// Media generado (galeria)
export interface GeneratedMedia {
  id: string;
  media_type: string;
  prompt: string;
  storage_url: string;
  status: string;
  created_at: string;
  edit_count: number;
  parent_media_id?: string;
}

// Alias para compatibilidad
export interface GeneratedImage extends GeneratedMedia {}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Respuesta especifica del callback de Google OAuth
export interface GoogleCallbackResponse {
  access_token: string;
  email?: string;
  user_id?: string;
  avatar_url?: string;
  picture?: string;
  role?: string;
  daily_limit?: number;
  used_quota?: number;
  is_unlimited?: boolean;
  quota_reset_at?: string;
}

// Respuesta de /auth/me
export interface MeResponse {
  email: string;
  user_id: string;
  daily_limit: number;
  used_quota: number;
  is_unlimited: boolean;
  role: string;
  quota_reset_at?: string;
}

export interface QuotaUpdate {
  user_id: string;
  quota: number;
}

export interface VendorStats {
  total_users: number;
  active_users: number;
  total_generations: number;
  quota_used: number;
  quota_total: number;
}

export interface AdminStats {
  total_users: number;
  total_media: number;
  admin_count: number;
  total_cost_usd: number;
}

// Admin user response
export interface AdminUser {
  id: string;
  email: string;
  role: string;
  daily_limit: number;
  used_quota: number;
  is_unlimited: boolean;
  vendor_id?: string;
}

// Vendor user response
export interface VendorUser {
  id: string;
  email: string;
  role: string;
  daily_limit: number;
  used_quota: number;
  is_unlimited: boolean;
  quota_reset_at?: string;
}

// Prompt template
export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
}

// Image report
export interface ImageReport {
  id: string;
  media_id: string;
  user_id: string;
  reason: string;
  status: string;
  admin_note?: string;
  created_at: string;
  reviewed_at?: string;
}

// User cost data
export interface UserCost {
  user_id: string;
  email: string;
  total_cost_usd: number;
  media_count: number;
}

// User media (admin view)
export interface UserMedia {
  id: string;
  media_type: string;
  prompt: string;
  storage_url: string;
  created_at: string;
  cost_usd?: number;
  model_used?: string;
}

// Helper para obtener token de cookie
function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )mf_access_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Helper para setear token en cookie
function setTokenCookie(token: string | null) {
  if (typeof document === "undefined") return;
  if (token) {
    // Cookie con expiracion de 7 dias
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `mf_access_token=${encodeURIComponent(token)}; path=/; expires=${expires}; SameSite=Lax`;
  } else {
    document.cookie = "mf_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}

// API Client class
class APIClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      // Primero intentar cookie, luego localStorage (para migracion)
      this.token = getTokenFromCookie() || localStorage.getItem("auth_token");
      // Si encontramos en localStorage pero no en cookie, migrar a cookie
      if (this.token && !getTokenFromCookie()) {
        setTokenCookie(this.token);
        localStorage.removeItem("auth_token");
      }
    }
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      setTokenCookie(token);
      // Limpiar localStorage antiguo
      if (token) {
        localStorage.removeItem("auth_token");
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    usePrefix: string = API_PREFIX
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (this.token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${usePrefix}${endpoint}`, {
      ...options,
      headers,
      credentials: "include", // Incluir cookies en requests
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Error: ${response.status}`);
    }

    // Handle 204 No Content
    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }

  // ============================================
  // Auth endpoints
  // ============================================

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Nota: El backend no implementa login con password, solo Google OAuth
    throw new Error("Login con password no implementado. Usa Google OAuth.");
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    // Nota: El backend no implementa registro con password, solo Google OAuth
    throw new Error("Registro con password no implementado. Usa Google OAuth.");
  }

  async loginWithGoogle(): Promise<void> {
    // Redirige directamente al endpoint de Google OAuth del backend
    window.location.href = `${API_BASE_URL}${API_PREFIX}/auth/google`;
  }

  async handleGoogleCallback(code: string): Promise<GoogleCallbackResponse> {
    const response = await this.request<GoogleCallbackResponse>(
      `/auth/google/callback?code=${encodeURIComponent(code)}`
    );
    this.setToken(response.access_token);
    return response;
  }

  async logout(): Promise<void> {
    this.setToken(null);
  }

  async getCurrentUser(): Promise<MeResponse> {
    return this.request<MeResponse>("/auth/me");
  }

  // ============================================
  // Generation endpoints
  // ============================================

  async createGeneration(data: GenerationRequest): Promise<GenerationTaskResponse> {
    return this.request<GenerationTaskResponse>("/generation/", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getTaskStatus(taskId: string): Promise<TaskStatusResponse> {
    return this.request<TaskStatusResponse>(`/generation/${taskId}`);
  }

  async getGenerations(): Promise<GeneratedMedia[]> {
    return this.request<GeneratedMedia[]>("/generation/");
  }

  async getPromptTemplates(): Promise<PromptTemplate[]> {
    return this.request<PromptTemplate[]>("/generation/prompt-templates");
  }

  async reportMedia(mediaId: string, reason: string): Promise<ImageReport> {
    return this.request<ImageReport>(`/generation/${mediaId}/report`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    });
  }

  async uploadReferenceImages(files: File[]): Promise<{ urls: string[] }> {
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

    const headers: HeadersInit = {};
    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(
      `${API_BASE_URL}${API_PREFIX}/generation/reference-images`,
      {
        method: "POST",
        headers,
        body: formData,
        credentials: "include",
      }
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Error: ${response.status}`);
    }

    return response.json();
  }

  // Metodo de polling para esperar resultado de generacion
  async waitForGeneration(
    taskId: string,
    onProgress?: (status: string, detail: string) => void,
    maxAttempts: number = 120,
    intervalMs: number = 2000
  ): Promise<GeneratedMedia | null> {
    let attempts = 0;

    while (attempts < maxAttempts) {
      const status = await this.getTaskStatus(taskId);
      
      if (onProgress) {
        onProgress(status.status, status.detail);
      }

      if (status.status === "success") {
        // Refetch media list to get the generated image
        const media = await this.getGenerations();
        // Return the most recent one
        return media.length > 0 ? media[0] : null;
      }

      if (status.status === "failure") {
        throw new Error(status.detail || "Error en la generacion");
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      attempts++;
    }

    throw new Error("Tiempo de espera agotado para la generacion");
  }

  // Metodo legacy para compatibilidad
  async generateImage(data: GenerationRequest): Promise<GeneratedMedia> {
    const task = await this.createGeneration(data);
    const result = await this.waitForGeneration(task.task_id);
    if (!result) {
      throw new Error("No se pudo obtener el resultado de la generacion");
    }
    return result;
  }

  // ============================================
  // Admin endpoints (usa /api/admin)
  // ============================================

  async getAdminStats(): Promise<AdminStats> {
    return this.request<AdminStats>("/stats", {}, API_PREFIX_ADMIN);
  }

  async getAdminUsers(): Promise<AdminUser[]> {
    return this.request<AdminUser[]>("/users", {}, API_PREFIX_ADMIN);
  }

  async createAdminUser(data: {
    email: string;
    role?: string;
    daily_limit?: number;
    is_unlimited?: boolean;
  }): Promise<AdminUser> {
    return this.request<AdminUser>(
      "/users",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      API_PREFIX_ADMIN
    );
  }

  async updateAdminUser(
    userId: string,
    data: {
      daily_limit?: number;
      role?: string;
      is_unlimited?: boolean;
    }
  ): Promise<AdminUser> {
    return this.request<AdminUser>(
      `/users/${userId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      API_PREFIX_ADMIN
    );
  }

  async deleteAdminUser(userId: string): Promise<void> {
    await this.request(`/users/${userId}`, { method: "DELETE" }, API_PREFIX_ADMIN);
  }

  async resetUserQuota(userId: string): Promise<AdminUser> {
    return this.request<AdminUser>(
      `/users/${userId}/reset-quota`,
      { method: "POST" },
      API_PREFIX_ADMIN
    );
  }

  async getUsersCost(): Promise<UserCost[]> {
    return this.request<UserCost[]>("/users-cost", {}, API_PREFIX_ADMIN);
  }

  async getUserMedia(userId: string): Promise<UserMedia[]> {
    return this.request<UserMedia[]>(`/users/${userId}/media`, {}, API_PREFIX_ADMIN);
  }

  async getPendingReports(): Promise<ImageReport[]> {
    return this.request<ImageReport[]>("/reports", {}, API_PREFIX_ADMIN);
  }

  async approveReport(reportId: string): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(
      `/reports/${reportId}/approve`,
      { method: "POST" },
      API_PREFIX_ADMIN
    );
  }

  async rejectReport(
    reportId: string,
    adminNote?: string
  ): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(
      `/reports/${reportId}/reject`,
      {
        method: "POST",
        body: JSON.stringify({ admin_note: adminNote }),
      },
      API_PREFIX_ADMIN
    );
  }

  // ============================================
  // Vendor endpoints (usa /api/vendor)
  // ============================================

  async getVendorUsers(): Promise<VendorUser[]> {
    return this.request<VendorUser[]>("/users", {}, API_PREFIX_VENDOR);
  }

  async createVendorUser(data: {
    email: string;
    name?: string;
    daily_limit?: number;
  }): Promise<VendorUser> {
    return this.request<VendorUser>(
      "/users",
      {
        method: "POST",
        body: JSON.stringify(data),
      },
      API_PREFIX_VENDOR
    );
  }

  async updateVendorUser(
    userId: string,
    data: { daily_limit: number }
  ): Promise<VendorUser> {
    return this.request<VendorUser>(
      `/users/${userId}`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
      API_PREFIX_VENDOR
    );
  }

  async deleteVendorUser(userId: string): Promise<void> {
    await this.request(`/users/${userId}`, { method: "DELETE" }, API_PREFIX_VENDOR);
  }
}

export const api = new APIClient();
export const apiClient = api;
