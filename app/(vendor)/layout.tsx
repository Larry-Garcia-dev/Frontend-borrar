"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Users,
  ChevronLeft,
  Store,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/lib/store/auth-store";

const sidebarLinks = [
  { href: "/vendor", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor/users", label: "Mis Usuarios", icon: Users },
];

export default function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, isInitialized } = useAuthStore();

  // Verificar que el usuario sea vendor
  useEffect(() => {
    if (isInitialized && (!isAuthenticated || !user?.isVendor)) {
      router.push("/dashboard");
    }
  }, [isInitialized, isAuthenticated, user, router]);

  // Mostrar loading mientras se verifica
  if (!isInitialized || !isAuthenticated || !user?.isVendor) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r border-border bg-card">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-20 items-center gap-3 border-b border-border px-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-600">
              <Store className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-foreground">Vendor Panel</p>
              <p className="text-xs text-muted-foreground">Macondo AI</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2 p-4">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link key={link.href} href={link.href}>
                  <motion.div
                    whileHover={{ x: 4 }}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium transition-colors",
                      isActive
                        ? "bg-blue-500/10 text-blue-500"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    {link.label}
                  </motion.div>
                </Link>
              );
            })}
          </nav>

          {/* Back link */}
          <div className="border-t border-border p-4">
            <Link href="/dashboard">
              <motion.div
                whileHover={{ x: -4 }}
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-base font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                <ChevronLeft className="h-5 w-5" />
                Volver al app
              </motion.div>
            </Link>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen p-8">{children}</main>
    </div>
  );
}
