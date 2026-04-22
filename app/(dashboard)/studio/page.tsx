"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CreateModelForm } from "@/components/studio/create-model-form";
import { api, ModelCreationRequest, ModelProfile } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store/auth-store";
import { formatDate } from "@/lib/utils";

// CORRECCIÓN: Claves actualizadas para coincidir con los strings del Backend
const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  // Estados de ModelCreationRequest (definidos en backend/services.py)
  PENDING: { icon: Clock, color: "text-amber-500", label: "Pendiente de revisión" },
  PAYMENT_PENDING: { icon: AlertCircle, color: "text-orange-500", label: "Pendiente de pago" },
  COMPLETED: { icon: CheckCircle, color: "text-green-500", label: "Completado" },
  
  // Estados de ModelProfile (definidos en backend/models/model_profile.py)
  APPROVED: { icon: CheckCircle, color: "text-green-500", label: "Aprobado" },
  TRAINING: { icon: Clock, color: "text-blue-500", label: "En entrenamiento" },
  READY: { icon: CheckCircle, color: "text-green-500", label: "Listo para usar" },
  ACTIVE: { icon: CheckCircle, color: "text-green-500", label: "Activo" },
  REJECTED: { icon: XCircle, color: "text-red-500", label: "Rechazado" },
};

export default function StudioPage() {
  const { user } = useAuthStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [requests, setRequests] = useState<ModelCreationRequest[]>([]);
  const [models, setModels] = useState<ModelProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const isStudio = user?.isStudioAdmin || user?.isMacondoAdmin;

  useEffect(() => {
    if (isStudio) {
      loadData();
    }
  }, [isStudio]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [requestsData, modelsData] = await Promise.all([
        api.getMyModelRequests(),
        api.getMyModels(),
      ]);
      setRequests(requestsData);
      setModels(modelsData);
    } catch (error) {
      console.error("Error loading studio data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isStudio) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Users className="mx-auto h-16 w-16 text-muted-foreground" />
          <h2 className="mt-4 text-2xl font-bold">Acceso Restringido</h2>
          <p className="mt-2 text-muted-foreground">
            Esta seccion es solo para estudios registrados.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Mis Modelos</h1>
          <p className="text-muted-foreground">
            Gestiona los modelos de tu estudio
          </p>
        </div>
        <Button
          variant="gradient"
          onClick={() => setShowCreateForm(true)}
          className="gap-2"
        >
          <Plus className="h-5 w-5" />
          Crear Nuevo Modelo
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{models.length}</p>
              <p className="text-sm text-muted-foreground">Modelos Activos</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {requests.filter((r) => r.status === "PENDING").length}
              </p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {requests.filter((r) => r.status === "COMPLETED").length}
              </p>
              <p className="text-sm text-muted-foreground">Completados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Models Grid */}
      {models.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Perfiles Activos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => {
              const status = statusConfig[model.status] || statusConfig.PENDING;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group rounded-xl border bg-card p-4 transition-all hover:shadow-md"
                >
                  <div className="flex items-start gap-4">
                    {model.training_photos && model.training_photos.length > 0 && (
                      <img
                        src={model.training_photos[0]}
                        alt={model.display_name}
                        className="h-16 w-16 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{model.display_name}</h3>
                      <div className={`flex items-center gap-1 text-sm ${status.color}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span>{status.label}</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Creado el {formatDate(model.created_at)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Requests Table */}
      {requests.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Solicitudes de Creación</h2>
          <div className="space-y-4">
            {requests.map((request) => {
              const status = statusConfig[request.status] || statusConfig.PENDING;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border bg-card p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary">
                        <Users className="h-6 w-6" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{request.model_name}</h3>
                        <p className="text-sm text-muted-foreground">{request.model_email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center gap-2 ${status.color}`}>
                        <StatusIcon className="h-5 w-5" />
                        <span className="font-medium">{status.label}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(request.created_at)}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && requests.length === 0 && models.length === 0 && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <Users className="mx-auto h-16 w-16 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-bold">No tienes modelos aún</h2>
            <p className="mt-2 text-muted-foreground">
              Comienza creando tu primer modelo de IA.
            </p>
            <Button
              variant="gradient"
              className="mt-4"
              onClick={() => setShowCreateForm(true)}
            >
              <Plus className="mr-2 h-5 w-5" />
              Crear Modelo
            </Button>
          </div>
        </div>
      )}

      {/* Modal Form */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Nueva Solicitud de Modelo</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowCreateForm(false)}>
                <XCircle className="h-6 w-6" />
              </Button>
            </div>
            <CreateModelForm
              onSuccess={() => {
                setShowCreateForm(false);
                loadData();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}