"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Image,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Store,
  CreditCard,
  UserPlus,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/auth-store";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Generar", icon: Sparkles },
  { href: "/gallery", label: "Galeria", icon: Image },
  { href: "/billing", label: "Balance", icon: CreditCard },
];

// Enlaces exclusivos para MACONDO_ADMIN (Super Admin)
const macondoAdminLinks = [
  { href: "/admin", label: "Dashboard Macondo", icon: LayoutDashboard },
  { href: "/admin/users", label: "Gestión de Usuarios", icon: Users },
];

// Enlaces exclusivos para ESTUDIO_ADMIN (Vendor/Estudio)
const estudioAdminLinks = [
  { href: "/vendor", label: "Dashboard Estudio", icon: LayoutDashboard },
  { href: "/studio", label: "Perfiles de Modelos", icon: UserPlus },
  { href: "/vendor/users", label: "Cuentas de Modelos", icon: Users },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [studioMenuOpen, setStudioMenuOpen] = useState(false);

  // Validación de los nuevos roles
  const isMacondoAdmin = user?.isMacondoAdmin || user?.role === "MACONDO_ADMIN";
  const isStudioAdmin = user?.isStudioAdmin || user?.role === "ESTUDIO_ADMIN";

  // Calcular créditos restantes
  const remainingCredits = user
    ? user.isUnlimited
      ? "Ilimitado"
      : user.dailyLimit - user.usedQuota
    : 0;

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg"
            >
              <Sparkles className="h-6 w-6 text-white" />
            </motion.div>
            <span className="text-2xl font-bold text-foreground">Macondo AI</span>
          </Link>

          {/* Navegación Desktop */}
          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated && (
              <>
                {/* Enlaces Generales (Para todos) */}
                {navLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link key={link.href} href={link.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className={cn(
                          "gap-2 text-base",
                          isActive && "bg-primary/10 text-primary"
                        )}
                      >
                        <Icon className="h-5 w-5" />
                        {link.label}
                      </Button>
                    </Link>
                  );
                })}

                {/* Dropdown de Macondo Admin */}
                {isMacondoAdmin && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      className="gap-2 text-base"
                      onClick={() => {
                        setAdminMenuOpen(!adminMenuOpen);
                        setStudioMenuOpen(false);
                      }}
                    >
                      <Shield className="h-5 w-5" />
                      Macondo
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <AnimatePresence>
                      {adminMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl"
                        >
                          {macondoAdminLinks.map((link) => {
                            const Icon = link.icon;
                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setAdminMenuOpen(false)}
                              >
                                <div className="flex items-center gap-3 rounded-lg px-4 py-3 text-base hover:bg-secondary">
                                  <Icon className="h-5 w-5" />
                                  {link.label}
                                </div>
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Dropdown de Estudio Admin */}
                {isStudioAdmin && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      className="gap-2 text-base"
                      onClick={() => {
                        setStudioMenuOpen(!studioMenuOpen);
                        setAdminMenuOpen(false);
                      }}
                    >
                      <Store className="h-5 w-5" />
                      Estudio
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <AnimatePresence>
                      {studioMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl"
                        >
                          {estudioAdminLinks.map((link) => {
                            const Icon = link.icon;
                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setStudioMenuOpen(false)}
                              >
                                <div className="flex items-center gap-3 rounded-lg px-4 py-3 text-base hover:bg-secondary">
                                  <Icon className="h-5 w-5" />
                                  {link.label}
                                </div>
                              </Link>
                            );
                          })}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Sección de Usuario (Notificaciones, Créditos y Perfil) */}
          <div className="hidden items-center gap-4 md:flex">
            {isAuthenticated ? (
              <>
                {/* Notificaciones */}
                <NotificationsDropdown />

                {/* Indicador de Cuota */}
                {user && (
                  <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {remainingCredits} créditos
                    </span>
                  </div>
                )}

                {/* Menú de Usuario */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-2 transition-colors hover:bg-secondary/80"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-lg font-bold text-white">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {user?.role?.replace("_", " ")}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  <AnimatePresence>
                    {userMenuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl"
                      >
                        <button
                          onClick={() => {
                            logout();
                            setUserMenuOpen(false);
                          }}
                          className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base text-destructive hover:bg-destructive/10"
                        >
                          <LogOut className="h-5 w-5" />
                          Cerrar sesión
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login">
                  <Button variant="ghost" size="lg">
                    Iniciar Sesión
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Botón de menú móvil */}
          <button
            className="rounded-lg p-2 hover:bg-secondary md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Menú Móvil */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-card md:hidden overflow-hidden"
          >
            <div className="space-y-2 p-4">
              {isAuthenticated ? (
                <>
                  {/* Créditos en móvil */}
                  {user && (
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-3 mb-4">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {remainingCredits} créditos
                      </span>
                    </div>
                  )}

                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 px-2">
                    Navegación
                  </div>
                  {navLinks.map((link) => {
                    const Icon = link.icon;
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <div className="flex items-center gap-3 rounded-lg px-4 py-3 text-lg hover:bg-secondary">
                          <Icon className="h-5 w-5" />
                          {link.label}
                        </div>
                      </Link>
                    );
                  })}

                  {isMacondoAdmin && (
                    <>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 px-2">
                        Admin Macondo
                      </div>
                      {macondoAdminLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <div className="flex items-center gap-3 rounded-lg px-4 py-3 text-lg hover:bg-secondary">
                              <Icon className="h-5 w-5" />
                              {link.label}
                            </div>
                          </Link>
                        );
                      })}
                    </>
                  )}

                  {isStudioAdmin && (
                    <>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 px-2">
                        Panel de Estudio
                      </div>
                      {estudioAdminLinks.map((link) => {
                        const Icon = link.icon;
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileMenuOpen(false)}
                          >
                            <div className="flex items-center gap-3 rounded-lg px-4 py-3 text-lg hover:bg-secondary">
                              <Icon className="h-5 w-5" />
                              {link.label}
                            </div>
                          </Link>
                        );
                      })}
                    </>
                  )}

                  <div className="my-4 border-t border-border"></div>

                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-lg text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-5 w-5" />
                    Cerrar sesión
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="lg" className="w-full">
                      Iniciar Sesión
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}