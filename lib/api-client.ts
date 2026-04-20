// API Client for Macondo AI Backend
// Configure this URL to match your backend deployment

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const API_PREFIX = "/api/v1";

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: "user" | "vendor" | "admin";
  quota: number;
  used_quota: number;
  created_at: string;
  is_active: boolean;
  vendor_id?: string;
}

export interface GenerationRequest {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  seed?: number;
}

export interface GeneratedImage {
  id: string;
  user_id: string;
  prompt: string;
  negative_prompt?: string;
  image_url: string;
  created_at: string;
  width: number;
  height: number;
  seed: number;
}

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
  total_vendors: number;
  total_generations: number;
  active_today: number;
  revenue: number;
}

// API Client class
class APIClient {
  private token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("auth_token");
    }
  }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      if (token) {
        localStorage.setItem("auth_token", token);
      } else {
        localStorage.removeItem("auth_token");
      }
    }
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    };

    if (this.token) {
      (headers as Record<string, string>)["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${API_PREFIX}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Error: ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials),
    });
    this.setToken(response.access_token);
    return response;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.setToken(response.access_token);
    return response;
  }

  async loginWithGoogle(): Promise<void> {
    // Redirige directamente al endpoint de Google OAuth del backend
    window.location.href = `${API_BASE_URL}${API_PREFIX}/auth/google`;
  }

  async handleGoogleCallback(code: string): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>(
      `/auth/google/callback?code=${code}`
    );
    this.setToken(response.access_token);
    return response;
  }

  async logout(): Promise<void> {
    this.setToken(null);
  }

  async getCurrentUser(): Promise<User> {
    return this.request<User>("/auth/me");
  }

  // Generation endpoints
  async generateImage(data: GenerationRequest): Promise<GeneratedImage> {
    return this.request<GeneratedImage>("/generate", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async getGenerations(page = 1, limit = 20): Promise<GeneratedImage[]> {
    return this.request<GeneratedImage[]>(
      `/generations?page=${page}&limit=${limit}`
    );
  }

  async getGeneration(id: string): Promise<GeneratedImage> {
    return this.request<GeneratedImage>(`/generations/${id}`);
  }

  async deleteGeneration(id: string): Promise<void> {
    await this.request(`/generations/${id}`, { method: "DELETE" });
  }

  // User management (Admin/Vendor)
  async getUsers(page = 1, limit = 20): Promise<User[]> {
    return this.request<User[]>(`/users?page=${page}&limit=${limit}`);
  }

  async getUser(id: string): Promise<User> {
    return this.request<User>(`/users/${id}`);
  }

  async updateUserQuota(data: QuotaUpdate): Promise<User> {
    return this.request<User>(`/users/${data.user_id}/quota`, {
      method: "PATCH",
      body: JSON.stringify({ quota: data.quota }),
    });
  }

  async toggleUserStatus(userId: string): Promise<User> {
    return this.request<User>(`/users/${userId}/toggle-status`, {
      method: "PATCH",
    });
  }

  async deleteUser(userId: string): Promise<void> {
    await this.request(`/users/${userId}`, { method: "DELETE" });
  }

  // Vendor endpoints
  async getVendorUsers(): Promise<User[]> {
    return this.request<User[]>("/vendor/users");
  }

  async getVendorStats(): Promise<VendorStats> {
    return this.request<VendorStats>("/vendor/stats");
  }

  async createVendorUser(data: RegisterData): Promise<User> {
    return this.request<User>("/vendor/users", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // Admin endpoints
  async getAdminStats(): Promise<AdminStats> {
    return this.request<AdminStats>("/admin/stats");
  }

  async getVendors(): Promise<User[]> {
    return this.request<User[]>("/admin/vendors");
  }

  async createVendor(data: RegisterData & { quota: number }): Promise<User> {
    return this.request<User>("/admin/vendors", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }
}

export const api = new APIClient();
