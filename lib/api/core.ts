import { API_BASE_URL, API_PREFIX, getTokenFromCookie, setTokenCookie } from './config';

export class BaseAPIClient {
  protected token: string | null = null;

  constructor() {
    if (typeof window !== "undefined") {
      this.token = getTokenFromCookie() || localStorage.getItem("auth_token");
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
      if (token) localStorage.removeItem("auth_token");
    }
  }

  async request<T>(
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
      credentials: "include",
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.detail || `Error: ${response.status}`);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return response.json();
  }
}