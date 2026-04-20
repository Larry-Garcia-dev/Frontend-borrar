"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Image as ImageIcon,
  TrendingUp,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, AdminStats } from "@/lib/api-client";
import { formatNumber } from "@/lib/utils";

const statCards = [
  {
    key: "total_users",
    label: "Total Usuarios",
    icon: Users,
    color: "from-blue-500 to-blue-600",
    change: "+12%",
    trend: "up",
  },
  {
    key: "total_vendors",
    label: "Vendors",
    icon: TrendingUp,
    color: "from-purple-500 to-purple-600",
    change: "+5%",
    trend: "up",
  },
  {
    key: "total_generations",
    label: "Generaciones",
    icon: ImageIcon,
    color: "from-green-500 to-green-600",
    change: "+23%",
    trend: "up",
  },
  {
    key: "active_today",
    label: "Activos Hoy",
    icon: Activity,
    color: "from-orange-500 to-orange-600",
    change: "-3%",
    trend: "down",
  },
];

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await api.getAdminStats();
        setStats(data);
      } catch (error) {
        console.error("Error fetching stats:", error);
        // Use mock data for demo
        setStats({
          total_users: 1284,
          total_vendors: 45,
          total_generations: 52847,
          active_today: 342,
          revenue: 12450,
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

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
          const value = stats?.[stat.key as keyof AdminStats] || 0;
          const isUp = stat.trend === "up";
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
                    <div
                      className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${
                        isUp
                          ? "bg-green-500/10 text-green-500"
                          : "bg-red-500/10 text-red-500"
                      }`}
                    >
                      {isUp ? (
                        <ArrowUpRight className="h-4 w-4" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4" />
                      )}
                      {stat.change}
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

      {/* Revenue Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="bg-gradient-to-br from-primary/10 to-accent/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-2xl">
              <DollarSign className="h-6 w-6 text-primary" />
              Ingresos del Mes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-5xl font-bold text-foreground">
              ${isLoading ? "..." : formatNumber(stats?.revenue || 0)}
            </p>
            <p className="mt-2 text-lg text-muted-foreground">
              Ingresos totales este mes
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Activity Section */}
      <div className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Actividad Reciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { action: "Nuevo usuario registrado", time: "hace 5 min", type: "user" },
                  { action: "Imagen generada", time: "hace 12 min", type: "image" },
                  { action: "Vendor creado", time: "hace 1 hora", type: "vendor" },
                  { action: "Cuota actualizada", time: "hace 2 horas", type: "quota" },
                  { action: "Usuario desactivado", time: "hace 3 horas", type: "user" },
                ].map((activity, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-secondary/50 p-4"
                  >
                    <span className="font-medium text-foreground">
                      {activity.action}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {activity.time}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Top Vendors</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: "Vendor Alpha", users: 245, generations: 12340 },
                  { name: "Vendor Beta", users: 189, generations: 9870 },
                  { name: "Vendor Gamma", users: 156, generations: 7650 },
                  { name: "Vendor Delta", users: 98, generations: 4320 },
                  { name: "Vendor Epsilon", users: 67, generations: 2890 },
                ].map((vendor, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-lg bg-secondary/50 p-4"
                  >
                    <div>
                      <p className="font-semibold text-foreground">{vendor.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {vendor.users} usuarios
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">
                        {formatNumber(vendor.generations)}
                      </p>
                      <p className="text-sm text-muted-foreground">generaciones</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
