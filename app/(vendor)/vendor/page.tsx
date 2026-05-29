"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Image as ImageIcon,
  Activity,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVendorStore } from "@/lib/store/vendor-store";
import { formatNumber } from "@/lib/utils";

export default function VendorDashboardPage() {
  const { users, isLoading, fetchUsers } = useVendorStore();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Calculate stats from users
  const totalUsers = users.length;
  const totalQuotaUsed = users.reduce((acc, user) => acc + user.used_quota, 0);
  const totalQuotaLimit = users.reduce((acc, user) => acc + user.daily_limit, 0);

  const statCards = [
    {
      label: "Total Usuarios",
      value: totalUsers,
      icon: Users,
      color: "from-blue-500 to-blue-600",
    },
    {
      label: "Cuota Usada",
      value: totalQuotaUsed,
      icon: Activity,
      color: "from-green-500 to-green-600",
    },
    {
      label: "Cuota Total",
      value: totalQuotaLimit,
      icon: ImageIcon,
      color: "from-purple-500 to-purple-600",
    },
  ];

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
          return (
            <motion.div
              key={stat.label}
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
                      {isLoading ? "..." : formatNumber(stat.value)}
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
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Acciones Rapidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Link
                href="/vendor/users"
                className="flex items-center justify-between rounded-lg bg-secondary/50 p-4 transition-colors hover:bg-secondary"
              >
                <div className="flex items-center gap-3">
                  <Users className="h-5 w-5 text-primary" />
                  <span className="font-medium text-foreground">
                    Gestionar Mis Usuarios
                  </span>
                </div>
                <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Users */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Usuarios Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex h-32 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : users.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No tienes usuarios todavia. Crea tu primer usuario.
              </p>
            ) : (
              <div className="space-y-4">
                {users.slice(0, 5).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between rounded-xl bg-secondary/50 p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-500 font-bold">
                        {user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{user.email}</p>
                        <p className="text-sm text-muted-foreground">
                          Cuota: {user.used_quota}/{user.daily_limit}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
