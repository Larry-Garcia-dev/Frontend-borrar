"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, LogOut, Menu, X, ChevronDown, Shield, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/auth-store";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";

// Importamos los nuevos componentes divididos
import { ROUTES } from "./navbar/config";
import { NavItem } from "./navbar/nav-item";
import { NavDropdown } from "./navbar/nav-dropdown";
import { MobileMenu } from "./navbar/mobile-menu";

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuthStore();
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Verificación de Roles
  const isMacondoAdmin = user?.isMacondoAdmin || user?.role === "MACONDO_ADMIN";
  const isStudioAdmin = user?.isStudioAdmin || user?.role === "ESTUDIO_ADMIN";
  const isModel = user?.role === "MODELO"; // <-- Nueva verificación

  const remainingCredits = user ? (user.isUnlimited ? "Ilimitado" : user.dailyLimit - user.usedQuota) : 0;

  // Filtrado de las rutas bases teniendo en cuenta la ocultación para modelos
  const visibleBaseLinks = ROUTES.base.filter(link => {
    if (isStudioAdmin && link.hideForStudio) return false;
    if (isModel && link.hideForModel) return false; // <-- Oculta Balance a las Modelos
    return true;
  });

  const toggleDropdown = (menuName: string) => {
    setOpenDropdown(openDropdown === menuName ? null : menuName);
  };

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          
          {/* LOGO */}
          <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.05, rotate: 5 }} className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg">
              <Sparkles className="h-6 w-6 text-white" />
            </motion.div>
            <span className="text-2xl font-bold text-foreground">Macondo AI</span>
          </Link>

          {/* NAVEGACIÓN DESKTOP */}
          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated && (
              <>
                {visibleBaseLinks.map((link) => (
                  <NavItem key={link.href} link={link} isActive={pathname === link.href} />
                ))}

                {isMacondoAdmin && (
                  <NavDropdown title="Macondo" icon={Shield} links={ROUTES.macondo} isOpen={openDropdown === 'macondo'} onToggle={() => toggleDropdown('macondo')} />
                )}

                {isStudioAdmin && (
                  <NavDropdown title="Estudio" icon={Store} links={ROUTES.studio} isOpen={openDropdown === 'studio'} onToggle={() => toggleDropdown('studio')} />
                )}
              </>
            )}
          </div>

          {/* PERFIL Y NOTIFICACIONES (DESKTOP) */}
          <div className="hidden items-center gap-4 md:flex">
            {isAuthenticated ? (
              <>
                <NotificationsDropdown />
                
                {user && (
                  <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{remainingCredits} créditos</span>
                  </div>
                )}

                <div className="relative">
                  <button onClick={() => toggleDropdown('user')} className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-2 transition-colors hover:bg-secondary/80">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-lg font-bold text-white">
                      {user?.email?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{user?.email}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user?.role?.replace("_", " ")}</p>
                    </div>
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  <AnimatePresence>
                    {openDropdown === 'user' && (
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl">
                        <button onClick={() => { logout(); setOpenDropdown(null); }} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-base text-destructive hover:bg-destructive/10">
                          <LogOut className="h-5 w-5" /> Cerrar sesión
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <Link href="/login">
                <Button variant="ghost" size="lg">Iniciar Sesión</Button>
              </Link>
            )}
          </div>

          {/* BOTÓN MENÚ MÓVIL */}
          <button className="rounded-lg p-2 hover:bg-secondary md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* NAVEGACIÓN MÓVIL (Componente importado) */}
      <MobileMenu 
        isOpen={mobileMenuOpen} 
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        isAuthenticated={isAuthenticated}
        logout={logout}
        visibleBaseLinks={visibleBaseLinks}
        isMacondoAdmin={isMacondoAdmin}
        isStudioAdmin={isStudioAdmin}
        remainingCredits={remainingCredits}
      />
    </nav>
  );
}