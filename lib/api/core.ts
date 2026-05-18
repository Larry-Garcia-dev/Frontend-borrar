import { 
  API_BASE_URL, 
  API_AUTH_BASE_URL, 
  API_VENDOR_BASE_URL, // <--- AÑADIDO AQUÍ
  API_ADMIN_BASE_URL, 
  API_PREFIX, 
  API_PREFIX_ADMIN, 
  API_PREFIX_VENDOR,   // <--- AÑADIDO AQUÍ
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

    // ENRUTADOR INTELIGENTE DE MICROSERVICIOS
    let baseUrl = API_BASE_URL; // Por defecto (Puerto 8000 - Python)
    
    if (endpoint.includes("/auth")) {
      baseUrl = API_AUTH_BASE_URL; // Puerto 4000 (Auth Node.js)
    } else if (usePrefix === API_PREFIX_ADMIN) {
      baseUrl = API_ADMIN_BASE_URL; // Puerto 4001 (Admin Node.js)
    } else if (usePrefix === API_PREFIX_VENDOR) {
      baseUrl = API_VENDOR_BASE_URL; // NUEVO: Puerto 4002 (Vendor Node.js)
    }

    const response = await fetch(`${baseUrl}${usePrefix}${endpoint}`, {
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