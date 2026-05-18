import { 
  API_BASE_URL, 
  API_AUTH_BASE_URL, 
  API_ADMIN_BASE_URL,
  API_VENDOR_BASE_URL,
  API_GENERATION_BASE_URL, // IMPORTADO
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
    let finalPrefix = usePrefix; // <-- ESTO FALTABA
    
    if (endpoint.includes("/auth")) {
      baseUrl = API_AUTH_BASE_URL;
    } else if (usePrefix === API_PREFIX_ADMIN) {
      baseUrl = API_ADMIN_BASE_URL;
    } else if (usePrefix === API_PREFIX_VENDOR) {
      baseUrl = API_VENDOR_BASE_URL;
    } else if (endpoint.startsWith("/generation")) {
      // <-- ESTA REGLA FALTABA PARA QUE FUNCIONE EL "APROBAR"
      baseUrl = API_GENERATION_BASE_URL;
      finalPrefix = "/api"; 
    }

    // Usar finalPrefix en lugar de usePrefix
    const fullUrl = `${baseUrl}${finalPrefix}${endpoint}`;

    try {
      const response = await fetch(fullUrl, {
        ...options,
        headers,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.detail || `Error: ${response.status}`);
      }

      if (response.status === 204) return {} as T;
      return response.json();
    } catch (error: any) {
      throw error;
    }
  }
}