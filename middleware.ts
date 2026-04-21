import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas que requieren autenticacion
const protectedRoutes = ["/dashboard", "/gallery", "/admin", "/vendor"];

// Rutas de admin (requieren rol ADMIN)
const adminRoutes = ["/admin"];

// Rutas de vendor (requieren rol VENDOR)
const vendorRoutes = ["/vendor"];

// Rutas publicas (accesibles sin autenticacion)
const publicRoutes = ["/", "/login", "/register", "/auth/callback"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Obtener token de la cookie
  const token = request.cookies.get("mf_access_token")?.value;

  // Verificar si es una ruta protegida
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Verificar si es una ruta publica
  const isPublicRoute = publicRoutes.some(
    (route) => pathname === route || pathname.startsWith("/auth/")
  );

  // Si no hay token y es ruta protegida, redirigir a login
  if (!token && isProtectedRoute) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Si hay token y esta en login/register, redirigir a dashboard
  if (token && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  // Para rutas de admin/vendor, la verificacion de rol se hace en el layout
  // ya que necesitamos hacer una llamada al backend para verificar el rol

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|public).*)",
  ],
};
