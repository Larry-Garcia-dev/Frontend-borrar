import {
  Sparkles,
  Image,
  CreditCard,
  LayoutDashboard,
  Users,
  Bot,
  UserPlus,
} from "lucide-react";

export const ROUTES = {
  // Rutas base (filtradas dinámicamente)
  base: [
    { href: "/dashboard", label: "Generar", icon: Sparkles, hideForStudio: true },
    { href: "/gallery", label: "Galeria", icon: Image },
    { href: "/billing", label: "Balance", icon: CreditCard, hideForModel: true }, // <-- Oculto para modelos
  ],
  // Rutas exclusivas para Super Admin Macondo
  macondo: [
    { href: "/admin", label: "Dashboard Macondo", icon: LayoutDashboard },
    { href: "/admin/users", label: "Gestión de Usuarios", icon: Users },
    { href: "/admin/prompts", label: "Prompts IA", icon: Bot },
    { href: "/admin/reports", label: "Reportes", icon: Users },
  ],
  // Rutas exclusivas para Estudios
  studio: [
    { href: "/studio", label: "Mis Modelos", icon: UserPlus },
  ],
};