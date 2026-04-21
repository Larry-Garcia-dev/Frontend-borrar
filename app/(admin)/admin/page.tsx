"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Image as ImageIcon,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Shield,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdminStore } from "@/lib/store/admin-store";
import { formatNumber } from "@/lib/utils";

const statCards = [
  {
    key: "total_users",
    label: "Total Usuarios",
    icon: Users,
    color: "from-blue-500 to-blue-600",
  },
  {
    key: "admin_count",
    label: "Administradores",
    icon: Shield,
    color: "from-purple-500 to-purple-600",
  },
  {
    key: "total_media",
    label: "Generaciones",
    icon: ImageIcon,
    color: "from-green-500 to-green-600",
  },
  {
    key: "total_cost_usd",
    label: "Costo Total (USD)",
    icon: DollarSign,
    color: "from-orange-500 to-orange-600",
    format: "currency",
  },
];

export default function AdminDashboardPage() {
  const { stats, isLoading, fetchStats } = useAdminStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold text-foreground">
          Dashboard de Administracion
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Vista general de la plataforma Macondo AI
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const value = stats?.[stat.key as keyof typeof stats] ?? 0;
          const displayValue =
            stat.format === "currency"
              ? `$${formatNumber(value as number)}`
              : formatNumber(value as number);
          return (
            <motion.div
              key={stat.key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div
                      className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${stat.color}`}
                    >
                      <Icon className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-bold text-foreground">
                      {isLoading ? "..." : displayValue}
                    </p>
                    <p className="mt-1 text-base text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Acciones Rapidas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <a
                  href="/admin/users"
                  className="flex items-center justify-between rounded-lg bg-secondary/50 p-4 transition-colors hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="font-medium text-foreground">
                      Gestionar Usuarios
                    </span>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                </a>
                <a
                  href="/admin/reports"
                  className="flex items-center justify-between rounded-lg bg-secondary/50 p-4 transition-colors hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <Activity className="h-5 w-5 text-primary" />
                    <span className="font-medium text-foreground">
                      Ver Reportes
                    </span>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                </a>
                <a
                  href="/admin/costs"
                  className="flex items-center justify-between rounded-lg bg-secondary/50 p-4 transition-colors hover:bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span className="font-medium text-foreground">
                      Ver Costos por Usuario
                    </span>
                  </div>
                  <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
                </a>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Resumen del Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
                  <span className="text-muted-foreground">Total Usuarios</span>
                  <span className="font-bold text-foreground">
                    {isLoading ? "..." : formatNumber(stats?.total_users ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
                  <span className="text-muted-foreground">
                    Total Generaciones
                  </span>
                  <span className="font-bold text-foreground">
                    {isLoading ? "..." : formatNumber(stats?.total_media ?? 0)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-secondary/50 p-4">
                  <span className="text-muted-foreground">
                    Costo Total (USD)
                  </span>
                  <span className="font-bold text-primary">
                    $
                    {isLoading
                      ? "..."
                      : formatNumber(stats?.total_cost_usd ?? 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
