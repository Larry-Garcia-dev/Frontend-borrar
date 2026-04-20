"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Image as ImageIcon,
  Activity,
  TrendingUp,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, VendorStats } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";

const statCards = [
  {
    key: "total_users",
    label: "Total Usuarios",
    icon: Users,
    color: "from-blue-500 to-blue-600",
  },
  {
    key: "active_users",
    label: "Usuarios Activos",
    icon: Activity,
    color: "from-green-500 to-green-600",
  },
  {
    key: "total_generations",
    label: "Generaciones",
    icon: ImageIcon,
    color: "from-purple-500 to-purple-600",
  },
];

export default function VendorDashboardPage() {
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getVendorStats();
        setStats(data);
      } catch (error) {
        console.error("Error fetching vendor stats:", error);
        // Mock data for demo
        setStats({
          total_users: 156,
          active_users: 89,
          total_generations: 4521,
          quota_used: 3200,
          quota_total: 5000,
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  const quotaPercent = stats
    ? (stats.quota_used / stats.quota_total) * 100
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-4xl font-bold text-foreground">
          Dashboard de Vendor
        </h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Estadisticas y rendimiento de tus usuarios
        </p>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          const value = stats?.[stat.key as keyof VendorStats] || 0;
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
                    <div className="flex items-center gap-1 rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-500">
                      <ArrowUpRight className="h-4 w-4" />
                      +12%
                    </div>
                  </div>
                  <div className="mt-4">
                    <p className="text-3xl font-bold text-foreground">
                      {isLoading ? "..." : formatNumber(value as number)}
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

      {/* Quota Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <TrendingUp className="h-6 w-6 text-primary" />
              Cuota Asignada
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-4xl font-bold text-foreground">
                    {isLoading ? "..." : formatNumber(stats?.quota_used || 0)}
                  </p>
                  <p className="text-muted-foreground">
                    de {formatNumber(stats?.quota_total || 0)} generaciones usadas
                  </p>
                </div>
                <span className="text-2xl font-bold text-primary">
                  {quotaPercent.toFixed(0)}%
                </span>
              </div>
              <div className="h-4 overflow-hidden rounded-full bg-secondary">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${quotaPercent}%` }}
                  transition={{ duration: 1, delay: 0.5 }}
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { user: "Usuario 1", action: "Genero 5 imagenes", time: "hace 10 min" },
                { user: "Usuario 2", action: "Se registro", time: "hace 30 min" },
                { user: "Usuario 3", action: "Genero 12 imagenes", time: "hace 1 hora" },
                { user: "Usuario 4", action: "Genero 3 imagenes", time: "hace 2 horas" },
                { user: "Usuario 5", action: "Se registro", time: "hace 3 horas" },
              ].map((activity, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-xl bg-secondary/50 p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-500">
                      {activity.user.charAt(activity.user.length - 1)}
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{activity.user}</p>
                      <p className="text-sm text-muted-foreground">{activity.action}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">{activity.time}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
