"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Image,
  Settings,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
  LayoutDashboard,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/dashboard", label: "Generar", icon: Sparkles },
  { href: "/gallery", label: "Galeria", icon: Image },
];

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Usuarios", icon: Users },
  { href: "/admin/settings", label: "Ajustes", icon: Settings },
];

const vendorLinks = [
  { href: "/vendor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor/users", label: "Mis Usuarios", icon: Users },
];

export function Navbar() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuthStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const isAdmin = user?.role === "admin";
  const isVendor = user?.role === "vendor";

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-20 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-3">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-lg"
            >
              <Sparkles className="h-6 w-6 text-white" />
            </motion.div>
            <span className="text-2xl font-bold text-foreground">Macondo AI</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden items-center gap-2 md:flex">
            {isAuthenticated && (
              <>
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

                {/* Admin/Vendor dropdown */}
                {(isAdmin || isVendor) && (
                  <div className="relative">
                    <Button
                      variant="ghost"
                      className="gap-2 text-base"
                      onClick={() => setUserMenuOpen(!userMenuOpen)}
                    >
                      {isAdmin ? (
                        <Settings className="h-5 w-5" />
                      ) : (
                        <Store className="h-5 w-5" />
                      )}
                      {isAdmin ? "Admin" : "Vendor"}
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                    <AnimatePresence>
                      {userMenuOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute right-0 top-full mt-2 w-48 rounded-xl border border-border bg-card p-2 shadow-xl"
                        >
                          {(isAdmin ? adminLinks : vendorLinks).map((link) => {
                            const Icon = link.icon;
                            return (
                              <Link
                                key={link.href}
                                href={link.href}
                                onClick={() => setUserMenuOpen(false)}
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

          {/* User section */}
          <div className="hidden items-center gap-4 md:flex">
            {isAuthenticated ? (
              <>
                {/* Quota indicator */}
                {user && (
                  <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">
                      {user.quota - user.used_quota} creditos
                    </span>
                  </div>
                )}

                {/* User menu */}
                <div className="relative">
                  <button
                    onClick={() => setUserMenuOpen(!userMenuOpen)}
                    className="flex items-center gap-3 rounded-xl bg-secondary px-4 py-2 transition-colors hover:bg-secondary/80"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-lg font-bold text-white">
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-semibold">{user?.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
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
                          Cerrar sesion
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
                    Iniciar Sesion
                  </Button>
                </Link>
                <Link href="/register">
                  <Button variant="gradient" size="lg">
                    Registrarse
                  </Button>
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <button
            className="rounded-lg p-2 hover:bg-secondary md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-border bg-card md:hidden"
          >
            <div className="space-y-2 p-4">
              {isAuthenticated ? (
                <>
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

                  {(isAdmin ? adminLinks : isVendor ? vendorLinks : []).map((link) => {
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

                  <button
                    onClick={() => {
                      logout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-lg text-destructive hover:bg-destructive/10"
                  >
                    <LogOut className="h-5 w-5" />
                    Cerrar sesion
                  </button>
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="outline" size="lg" className="w-full">
                      Iniciar Sesion
                    </Button>
                  </Link>
                  <Link href="/register" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="gradient" size="lg" className="w-full">
                      Registrarse
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
