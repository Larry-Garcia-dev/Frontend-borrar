"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useAuthStore } from "@/lib/store/auth-store";
import { ParticleLoader } from "@/components/ui/particle-loader";

export default function AuthCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { handleGoogleCallback } = useAuthStore();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Autenticando con Google...");
  
  // Guard to prevent double execution (React 18 strict mode + dependency changes)
  const isProcessingRef = useRef(false);
  const processedCodeRef = useRef<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      const code = searchParams.get("code");

      if (!code) {
        setError("No se recibio el codigo de autorizacion de Google.");
        setTimeout(() => router.push("/login"), 3000);
        return;
      }

      // Prevent double execution - codes can only be used once
      if (isProcessingRef.current || processedCodeRef.current === code) {
        console.log("[v0] Callback already processing or code already used, skipping...");
        return;
      }
      
      isProcessingRef.current = true;
      processedCodeRef.current = code;

      try {
        setStatus("Verificando credenciales...");
        
        // Usar el handleGoogleCallback del store que maneja todo
        const user = await handleGoogleCallback(code);
        
        setStatus("Iniciando sesion...");
        
        // Redirigir segun el rol del usuario
        setTimeout(() => {
          if (user.isAdmin) {
            router.push("/admin");
          } else if (user.isVendor) {
            router.push("/vendor");
          } else {
            router.push("/dashboard");
          }
        }, 500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error de autenticacion");
        isProcessingRef.current = false; // Reset on error to allow retry with new code
        setTimeout(() => router.push("/login"), 3000);
      }
    };

    processCallback();
  }, [searchParams, router, handleGoogleCallback]);

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
