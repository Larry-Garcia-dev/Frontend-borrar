import { BaseAPIClient } from './core';
import { API_BASE_URL, API_PREFIX } from './config';
import { LoginCredentials, RegisterData, AuthResponse, GoogleCallbackResponse, MeResponse } from './types';

export const createAuthApi = (client: BaseAPIClient) => ({
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const formData = new URLSearchParams();
    formData.append("username", credentials.email);
    formData.append("password", credentials.password);
    const response = await client.request<AuthResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
    });
    client.setToken(response.access_token);
    return response;
  },
  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await client.request<AuthResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    client.setToken(response.access_token);
    return response;
  },
  loginWithGoogle(): void {
    window.location.href = `${API_BASE_URL}${API_PREFIX}/auth/google`;
  },
  async handleGoogleCallback(code: string): Promise<GoogleCallbackResponse> {
    const response = await client.request<GoogleCallbackResponse>(
      `/auth/google/callback?code=${encodeURIComponent(code)}`
    );
    client.setToken(response.access_token);
    return response;
  },
  async logout(): Promise<void> {
    client.setToken(null);
  },
  async getCurrentUser(): Promise<MeResponse> {
    return client.request<MeResponse>("/auth/me");
  }
});