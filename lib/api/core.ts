import { 
  API_BASE_URL, 
  API_AUTH_BASE_URL, 
  API_ADMIN_BASE_URL,
  API_VENDOR_BASE_URL,
  API_PREFIX, 
  API_PREFIX_ADMIN, 
  API_PREFIX_VENDOR,
  getTokenFromCookie, 
  setTokenCookie 
} from './config';

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

  getToken(): string | null { return this.token; }

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== "undefined") {
      setTokenCookie(token);
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

    let baseUrl = API_BASE_URL;
    
    if (endpoint.includes("/auth")) {
      baseUrl = API_AUTH_BASE_URL;
    } else if (usePrefix === API_PREFIX_ADMIN) {
      baseUrl = API_ADMIN_BASE_URL;
    } else if (usePrefix === API_PREFIX_VENDOR) {
      baseUrl = API_VENDOR_BASE_URL;
    }

    const fullUrl = `${baseUrl}${usePrefix}${endpoint}`;
    console.log("[v0] API Request:", options.method || 'GET', fullUrl);
    console.log("[v0] API Token:", this.token ? "SET" : "NOT SET");

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: "include",
      });

      console.log("[v0] API Response status:", response.status);

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error("[v0] API Error response:", error);
        throw new Error(error.detail || `Error: ${response.status}`);
      }

      if (response.status === 204) return {} as T;
      const data = await response.json();
      console.log("[v0] API Success response received");
      return data;
    } catch (error: any) {
      console.error("[v0] API Fetch error:", error.message);
      throw error;
    }
  }
}
