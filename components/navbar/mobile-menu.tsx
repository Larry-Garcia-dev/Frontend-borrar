import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NavItem } from "./nav-item";
import { ROUTES } from "./config";
import { AuthUser } from "@/lib/store/auth-store";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  isAuthenticated: boolean;
  logout: () => void;
  visibleBaseLinks: Array<any>;
  isMacondoAdmin: boolean;
  isStudioAdmin: boolean;
  remainingCredits: number | string;
}

export function MobileMenu({
  isOpen, onClose, user, isAuthenticated, logout,
  visibleBaseLinks, isMacondoAdmin, isStudioAdmin, remainingCredits
}: MobileMenuProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence>
      {isOpen && (
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
                  <NavItem key={link.href} link={link} isActive={pathname === link.href} isMobile onClick={onClose} />
                ))}

                {isMacondoAdmin && (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 px-2">Admin Macondo</div>
                    {ROUTES.macondo.map((link) => (
                      <NavItem key={link.href} link={link} isActive={pathname === link.href} isMobile onClick={onClose} />
                    ))}
                  </>
                )}

                {isStudioAdmin && (
                  <>
                    <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 px-2">Panel de Estudio</div>
                    {ROUTES.studio.map((link) => (
                      <NavItem key={link.href} link={link} isActive={pathname === link.href} isMobile onClick={onClose} />
                    ))}
                  </>
                )}

                <div className="my-4 border-t border-border"></div>

                <button onClick={() => { logout(); onClose(); }} className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-lg text-destructive hover:bg-destructive/10">
                  <LogOut className="h-5 w-5" /> Cerrar sesión
                </button>
              </>
            ) : (
              <Link href="/login" onClick={onClose}>
                <Button variant="outline" size="lg" className="w-full">Iniciar Sesión</Button>
              </Link>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}