"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/lib/store/auth-store";

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const { initializeFromCookie, isInitialized } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    initializeFromCookie();
  }, [initializeFromCookie]);

  // Evitar hydration mismatch
  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}
