"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CreditCard,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Image as ImageIcon,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, UserBalance, BillingRecord } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store/auth-store";
import { formatCurrency, formatDate } from "@/lib/utils";

const recordTypeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  IMAGE_GENERATION: { icon: ImageIcon, color: "text-blue-500", label: "Generacion de imagen" },
  AI_TRAINING: { icon: TrendingUp, color: "text-purple-500", label: "Entrenamiento AI" },
  PAYMENT: { icon: DollarSign, color: "text-green-500", label: "Pago" },
  CREDIT: { icon: ArrowDownRight, color: "text-green-500", label: "Credito" },
  ADJUSTMENT: { icon: TrendingDown, color: "text-amber-500", label: "Ajuste" },
};

export default function BillingPage() {
  const { user } = useAuthStore();
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "costs" | "payments">("all");

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    setIsLoading(true);
    try {
      const [balanceData, recordsData] = await Promise.all([
        api.getMyBalance(),
        api.getMyBillingRecords(),
      ]);
      setBalance(balanceData);
      setRecords(recordsData);
    } catch (error) {
      console.error("Error loading billing data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRecords = records.filter((record) => {
    if (activeTab === "all") return true;
    if (activeTab === "costs") return ["IMAGE_GENERATION", "AI_TRAINING"].includes(record.record_type);
    if (activeTab === "payments") return ["PAYMENT", "CREDIT", "ADJUSTMENT"].includes(record.record_type);
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Mi Balance</h1>
        <p className="text-muted-foreground text-sm sm:text-base">
          Revisa tu historial de costos y pagos
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Balance Actual</p>
                  <p className={`text-2xl sm:text-3xl font-bold ${(balance?.balance_usd ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`}>
                    {formatCurrency(balance?.balance_usd ?? 0)}
                  </p>
                </div>
                <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${(balance?.balance_usd ?? 0) >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}>
                  <CreditCard className={`h-6 w-6 ${(balance?.balance_usd ?? 0) >= 0 ? "text-green-500" : "text-red-500"}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Costos</p>
                  <p className="text-2xl sm:text-3xl font-bold text-red-500">
                    {formatCurrency(balance?.total_costs_usd ?? 0)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10">
                  <TrendingDown className="h-6 w-6 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Pagos</p>
                  <p className="text-2xl sm:text-3xl font-bold text-green-500">
                    {formatCurrency(balance?.total_payments_usd ?? 0)}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-500/10">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Imagenes Generadas</p>
                  <p className="text-2xl sm:text-3xl font-bold">
                    {balance?.total_images_generated ?? 0}
                  </p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                  <ImageIcon className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Transactions */}
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle>Historial de Transacciones</CardTitle>
            <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setActiveTab("all")}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "all"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Todos
              </button>
              <button
                onClick={() => setActiveTab("costs")}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "costs"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Costos
              </button>
              <button
                onClick={() => setActiveTab("payments")}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  activeTab === "payments"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                Pagos
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredRecords.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Clock className="mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-lg font-medium">No hay transacciones</p>
              <p className="text-sm text-muted-foreground">
                Tus transacciones apareceran aqui
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRecords.map((record, index) => {
                const config = recordTypeConfig[record.record_type] || {
                  icon: CreditCard,
                  color: "text-muted-foreground",
                  label: record.record_type,
                };
                const Icon = config.icon;
                const isPositive = ["PAYMENT", "CREDIT"].includes(record.record_type);

                return (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="flex items-center gap-4 rounded-xl border bg-card p-4"
                  >
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary ${config.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{record.description}</p>
                      <p className="text-sm text-muted-foreground">{config.label}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-semibold ${isPositive ? "text-green-500" : "text-red-500"}`}>
                        {isPositive ? "+" : "-"}{formatCurrency(Math.abs(record.amount_usd))}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(record.created_at)}
                      </p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
