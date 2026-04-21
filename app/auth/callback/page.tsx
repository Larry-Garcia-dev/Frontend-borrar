"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store/auth-store";
import { ParticleLoader } from "@/components/ui/particle-loader";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Autenticando con Google...");

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get("code");

      if (!code) {
        setError("No se recibio el codigo de autorizacion de Google.");
        setTimeout(() => router.push("/login"), 3000);
        return;
      }

      try {
        setStatus("Verificando credenciales...");
        
        // Llamar al backend con el code para obtener el token
        const response = await apiClient.handleGoogleCallback(code);
        
        if (response.access_token) {
          setStatus("Iniciando sesion...");
          
          // Guardar el token en cookie
          document.cookie = `mf_access_token=${response.access_token}; path=/; secure; samesite=lax`;
          
          // Actualizar el store con los datos del usuario
          setToken(response.access_token);
          setUser({
            id: response.user_id || "",
            email: response.email || "",
            avatar: response.avatar_url || response.picture || "",
            role: response.role || "CREATOR",
            isAdmin: ["santoles5@gmail.com", "larry.garcia@macondosoftwares.com"].includes(
              (response.email || "").toLowerCase()
            ),
            dailyLimit: response.daily_limit || 10,
            usedQuota: response.used_quota || 0,
            isUnlimited: response.is_unlimited || false,
            quotaResetAt: response.quota_reset_at || "",
          });
          
          setStatus("Redirigiendo al dashboard...");
          setTimeout(() => router.push("/dashboard"), 500);
        } else {
          setError("No se pudo obtener el token de acceso.");
          setTimeout(() => router.push("/login"), 3000);
        }
      } catch (err) {
        console.error("[v0] Error en callback de Google:", err);
        setError(err instanceof Error ? err.message : "Error de autenticacion");
        setTimeout(() => router.push("/login"), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router, setUser, setToken]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center"
      >
        {error ? (
          <div className="space-y-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-20 h-20 mx-auto rounded-full bg-destructive/10 flex items-center justify-center"
            >
              <svg
                className="w-10 h-10 text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground">Error de Autenticacion</h2>
            <p className="text-muted-foreground">{error}</p>
            <p className="text-sm text-muted-foreground">Redirigiendo al login...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <ParticleLoader size="lg" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">{status}</h2>
              <p className="text-muted-foreground">Por favor espera un momento</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
