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

// ==========================================
// 1. CONFIGURACIÓN CENTRALIZADA DE RUTAS
// ==========================================
const ROUTES = {
  // Rutas base (filtradas dinámicamente según el rol más abajo)
  base: [
    { href: "/dashboard", label: "Generar", icon: Sparkles, hideForStudio: true },
    { href: "/gallery", label: "Galeria", icon: Image },
    { href: "/billing", label: "Balance", icon: CreditCard },
  ],
  // Rutas exclusivas para Super Admin
  macondo: [
    { href: "/admin", label: "Dashboard Macondo", icon: LayoutDashboard },
    { href: "/admin/users", label: "Gestión de Usuarios", icon: Users },
  ],
  // Rutas exclusivas para Estudios
  studio: [
    { href: "/vendor", label: "Dashboard Estudio", icon: LayoutDashboard },
    { href: "/studio", label: "Gestión de Modelos", icon: UserPlus },
    { href: "/vendor/users", label: "Cuentas de Modelos", icon: Users },
  ],
};

// ==========================================
// 2. SUB-COMPONENTES DE INTERFAZ (UI)
// ==========================================

const NavItem = ({ link, isActive, onClick, isMobile = false }: any) => {
  const Icon = link.icon;

  if (isMobile) {
    return (
      <Link href={link.href} onClick={onClick}>
        <div className={cn("flex items-center gap-3 rounded-lg px-4 py-3 text-lg hover:bg-secondary", isActive && "bg-primary/10 text-primary")}>
          <Icon className="h-5 w-5" />
          {link.label}
        </div>
      </Link>
    );
  }

  return (
    <Link href={link.href}>
      <Button variant={isActive ? "secondary" : "ghost"} className={cn("gap-2 text-base", isActive && "bg-primary/10 text-primary")}>
        <Icon className="h-5 w-5" />
        {link.label}
      </Button>
    </Link>
  );
};

const NavDropdown = ({ title, icon: Icon, links, isOpen, onToggle }: any) => {
  const pathname = usePathname();
  return (
    <div className="relative">
      <Button variant="ghost" className="gap-2 text-base" onClick={onToggle}>
        <Icon className="h-5 w-5" /> {title} <ChevronDown className="h-4 w-4" />
      </Button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            className="absolute right-0 top-full mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-xl"
          >
            {links.map((link: any) => (
              <Link key={link.href} href={link.href} onClick={onToggle}>
                <div className={cn("flex items-center gap-3 rounded-lg px-4 py-3 text-base hover:bg-secondary", pathname === link.href && "bg-primary/10 text-primary")}>
                  <link.icon className="h-5 w-5" /> {link.label}
                </div>
              </Link>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ==========================================
// 3. COMPONENTE PRINCIPAL
// ==========================================

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuthStore();
  
  // Estados para controlar qué menú está abierto (solo permitimos un dropdown abierto a la vez)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Verificación de Roles
  const isMacondoAdmin = user?.isMacondoAdmin || user?.role === "MACONDO_ADMIN";
  const isStudioAdmin = user?.isStudioAdmin || user?.role === "ESTUDIO_ADMIN";

  // Créditos restantes
  const remainingCredits = user ? (user.isUnlimited ? "Ilimitado" : user.dailyLimit - user.usedQuota) : 0;

  // Filtrado de las rutas bases (Aplica la regla de que el Estudio no ve "Generar")
  const visibleBaseLinks = ROUTES.base.filter(link => !(isStudioAdmin && link.hideForStudio));

  // Función para alternar menús
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

      {/* NAVEGACIÓN MÓVIL */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="border-t border-border bg-card md:hidden overflow-hidden">
            <div className="space-y-2 p-4">
              {isAuthenticated ? (
                <>
                  {user && (
                    <div className="flex items-center justify-center gap-2 rounded-lg bg-secondary px-4 py-3 mb-4">
                      <Sparkles className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">{remainingCredits} créditos</span>
                    </div>
                  )}

                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 px-2">Navegación</div>
                  {visibleBaseLinks.map((link) => (
                    <NavItem key={link.href} link={link} isActive={pathname === link.href} isMobile onClick={() => setMobileMenuOpen(false)} />
                  ))}

                  {isMacondoAdmin && (
                    <>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 px-2">Admin Macondo</div>
                      {ROUTES.macondo.map((link) => (
                        <NavItem key={link.href} link={link} isActive={pathname === link.href} isMobile onClick={() => setMobileMenuOpen(false)} />
                      ))}
                    </>
                  )}

                  {isStudioAdmin && (
                    <>
                      <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 px-2">Panel de Estudio</div>
                      {ROUTES.studio.map((link) => (
                        <NavItem key={link.href} link={link} isActive={pathname === link.href} isMobile onClick={() => setMobileMenuOpen(false)} />
                      ))}
                    </>
                  )}

                  <div className="my-4 border-t border-border"></div>

                  <button onClick={() => { logout(); setMobileMenuOpen(false); }} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-lg text-destructive hover:bg-destructive/10">
                    <LogOut className="h-5 w-5" /> Cerrar sesión
                  </button>
                </>
              ) : (
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" size="lg" className="w-full">Iniciar Sesión</Button>
                </Link>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}