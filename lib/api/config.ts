export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
export const API_AUTH_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || "http://localhost:4000";
export const API_ADMIN_BASE_URL = process.env.NEXT_PUBLIC_ADMIN_API_URL || "http://localhost:4001";
// AÑADE ESTA LÍNEA:
export const API_VENDOR_BASE_URL = process.env.NEXT_PUBLIC_VENDOR_API_URL || "http://localhost:4002"; 

export const API_PREFIX = "/api/v1";
export const API_PREFIX_ADMIN = "/api/admin";
export const API_PREFIX_VENDOR = "/api/vendor"; // Ya lo tenías, está perfecto

export function resolveMediaUrl(url: string): string {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("/")) return `${API_BASE_URL}${url}`;
  return url;
}

export function getTokenFromCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )mf_access_token=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export function setTokenCookie(token: string | null) {
  if (typeof document === "undefined") return;
  if (token) {
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `mf_access_token=${encodeURIComponent(token)}; path=/; expires=${expires}; SameSite=Lax`;
  } else {
    document.cookie = "mf_access_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
}