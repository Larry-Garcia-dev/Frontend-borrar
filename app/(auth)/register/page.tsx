"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, User, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuthStore } from "@/lib/store/auth-store";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loginWithGoogle, isLoading, error, clearError } = useAuthStore();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState("");

  const passwordRequirements = [
    { label: "Minimo 8 caracteres", met: password.length >= 8 },
    { label: "Al menos una mayuscula", met: /[A-Z]/.test(password) },
    { label: "Al menos un numero", met: /\d/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError("");

    if (password !== confirmPassword) {
      setLocalError("Las contrasenas no coinciden");
      return;
    }

    if (!passwordRequirements.every((r) => r.met)) {
      setLocalError("La contrasena no cumple los requisitos");
      return;
    }

    try {
      await register({ name, email, password });
      router.push("/dashboard");
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-xl">
      <CardHeader className="space-y-4 text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <CardTitle className="text-3xl font-bold">Crea tu cuenta</CardTitle>
        </motion.div>
        <CardDescription className="text-lg">
          Comienza a crear imagenes increibles con IA
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Google Register */}
        <Button
          variant="outline"
          size="lg"
          className="w-full gap-3 text-lg"
          onClick={loginWithGoogle}
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          Registrarse con Google
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-card px-4 text-muted-foreground">o con tu email</span>
          </div>
        </div>

        {/* Register Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            type="text"
            label="Nombre completo"
            placeholder="Tu nombre"
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<User className="h-5 w-5" />}
            required
          />

          <Input
            type="email"
            label="Correo electronico"
            placeholder="tu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="h-5 w-5" />}
            required
          />

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              label="Contrasena"
              placeholder="Crea una contrasena segura"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={<Lock className="h-5 w-5" />}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-[46px] text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>

          {/* Password requirements */}
          <div className="space-y-2">
            {passwordRequirements.map((req, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-2 text-sm"
              >
                <div
                  className={`flex h-5 w-5 items-center justify-center rounded-full transition-colors ${
                    req.met ? "bg-success text-white" : "bg-muted"
                  }`}
                >
                  {req.met && <Check className="h-3 w-3" />}
                </div>
                <span className={req.met ? "text-success" : "text-muted-foreground"}>
                  {req.label}
                </span>
              </motion.div>
            ))}
          </div>

          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              label="Confirmar contrasena"
              placeholder="Repite tu contrasena"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={<Lock className="h-5 w-5" />}
              required
            />
          </div>

          {(error || localError) && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center text-sm font-medium text-destructive"
            >
              {error || localError}
            </motion.p>
          )}

          <Button
            type="submit"
            variant="gradient"
            size="lg"
            className="w-full text-lg"
            isLoading={isLoading}
          >
            Crear Cuenta
          </Button>
        </form>

        {/* Login link */}
        <p className="text-center text-base text-muted-foreground">
          Ya tienes cuenta?{" "}
          <Link
            href="/login"
            className="font-semibold text-primary hover:underline"
          >
            Inicia sesion
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
