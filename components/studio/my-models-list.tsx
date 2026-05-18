"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Clock, CheckCircle, XCircle, DollarSign, Pause } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useModelsStore } from "@/lib/store/models-store";
import { cn } from "@/lib/utils";

const statusConfig: Record<string, { label: string; color: string; icon: any; bg: string }> = {
  PENDING: { label: "Pendiente Revision", color: "text-blue-500", icon: Clock, bg: "bg-blue-500/10" },
  PAYMENT_PENDING: { label: "Pendiente Pago", color: "text-amber-500", icon: DollarSign, bg: "bg-amber-500/10" },
  APPROVED: { label: "Aprobada", color: "text-green-500", icon: CheckCircle, bg: "bg-green-500/10" },
  ACTIVE: { label: "Activa", color: "text-green-500", icon: CheckCircle, bg: "bg-green-500/10" },
  READY: { label: "Lista", color: "text-green-500", icon: CheckCircle, bg: "bg-green-500/10" },
  SUSPENDED: { label: "Pausada", color: "text-orange-500", icon: Pause, bg: "bg-orange-500/10" },
  REJECTED: { label: "Rechazada", color: "text-red-500", icon: XCircle, bg: "bg-red-500/10" },
  COMPLETED: { label: "Completada", color: "text-green-500", icon: CheckCircle, bg: "bg-green-500/10" },
};

export function MyModelsList() {
  const { models, requests, isLoading, fetchModelsAndRequests } = useModelsStore();

  useEffect(() => {
    fetchModelsAndRequests();
  }, [fetchModelsAndRequests]);

  // Combinar solicitudes pendientes y perfiles aprobados
  const allItems = [
    ...requests.map((r) => ({ type: "request" as const, data: r })),
    ...models.map((m) => ({ type: "profile" as const, data: m })),
  ].sort((a, b) => {
    const dateA = new Date(a.data.created_at).getTime();
    const dateB = new Date(b.data.created_at).getTime();
    return dateB - dateA;
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (allItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 bg-card rounded-2xl border">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-xl font-semibold">No tienes modelos todavia</p>
        <p className="text-muted-foreground mt-2">Crea tu primera modelo para empezar</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {allItems.map((item, index) => {
        const isRequest = item.type === "request";
        const status = isRequest ? item.data.status : item.data.status;
        const name = isRequest ? item.data.model_name : item.data.display_name;
        const email = isRequest ? item.data.model_email : null;
        const config = statusConfig[status] || statusConfig.PENDING;
        const Icon = config.icon;

        return (
          <motion.div
            key={item.data.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="overflow-hidden transition-all hover:border-primary/50">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 text-xl font-bold text-white">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-lg font-semibold text-foreground">{name}</p>
                      {email && <p className="text-xs text-muted-foreground">{email}</p>}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <div className={cn("flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium", config.bg, config.color)}>
                    <Icon className="h-3.5 w-3.5" />
                    {config.label}
                  </div>
                  {isRequest && item.data.is_explicit && (
                    <span className="px-2 py-1 rounded-full text-xs bg-red-500/10 text-red-500 font-medium">
                      +18
                    </span>
                  )}
                </div>

                {isRequest && item.data.rejection_reason && (
                  <div className="mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <p className="text-xs text-red-400">Razon: {item.data.rejection_reason}</p>
                  </div>
                )}

                {!isRequest && (
                  <div className="mt-4 text-sm text-muted-foreground">
                    <p>Fotos por orden: {item.data.images_per_order}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
