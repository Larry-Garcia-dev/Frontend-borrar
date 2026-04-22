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

const statusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  PENDING_REVIEW: { icon: Clock, color: "text-amber-500", label: "Pendiente de revision" },
  PENDING_PAYMENT: { icon: AlertCircle, color: "text-orange-500", label: "Pendiente de pago" },
  APPROVED: { icon: CheckCircle, color: "text-green-500", label: "Aprobado" },
  REJECTED: { icon: XCircle, color: "text-red-500", label: "Rechazado" },
  TRAINING: { icon: Clock, color: "text-blue-500", label: "En entrenamiento" },
  ACTIVE: { icon: CheckCircle, color: "text-green-500", label: "Activo" },
};

export default function StudioPage() {
  const { user } = useAuthStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [requests, setRequests] = useState<ModelCreationRequest[]>([]);
  const [models, setModels] = useState<ModelProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  //const isStudio = user?.role === "STUDIO" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
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
    <div className="space-y-8">
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

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-6">
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
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-amber-500/10">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {requests.filter((r) => r.status === "PENDING_REVIEW").length}
              </p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </div>
        </div>
        <div className="rounded-xl border bg-card p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {requests.filter((r) => r.status === "APPROVED").length}
              </p>
              <p className="text-sm text-muted-foreground">Aprobados</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Models */}
      {models.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Modelos Activos</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => {
              const status = statusConfig[model.status] || statusConfig.PENDING_REVIEW;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="group rounded-xl border bg-card p-4 transition-shadow hover:shadow-lg"
                >
                  <div className="flex items-start gap-4">
                    {model.training_photos.length > 0 && (
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
                      <p className="mt-1 text-sm text-muted-foreground">
                        {model.images_per_order} imagenes por orden
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Requests */}
      {requests.length > 0 && (
        <div>
          <h2 className="mb-4 text-xl font-semibold">Solicitudes de Creacion</h2>
          <div className="space-y-4">
            {requests.map((request) => {
              const status = statusConfig[request.status] || statusConfig.PENDING_REVIEW;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={request.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border bg-card p-6"
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

                  {request.status === "REJECTED" && request.rejection_reason && (
                    <div className="mt-4 rounded-lg bg-destructive/10 p-4">
                      <p className="text-sm text-destructive">
                        <strong>Razon del rechazo:</strong> {request.rejection_reason}
                      </p>
                    </div>
                  )}

                  {request.status === "PENDING_PAYMENT" && (
                    <div className="mt-4 rounded-lg bg-amber-500/10 p-4">
                      <p className="text-sm text-amber-700">
                        <strong>Pago requerido:</strong> ${request.payment_amount_usd?.toFixed(2)} USD
                      </p>
                      <p className="mt-1 text-xs text-amber-600">
                        Contacta al administrador para completar el pago.
                      </p>
                    </div>
                  )}

                  {/* Training photos preview */}
                  {request.training_photos.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-2 text-sm font-medium">Fotos de entrenamiento ({request.training_photos.length})</p>
                      <div className="flex gap-2 overflow-x-auto pb-2">
                        {request.training_photos.slice(0, 6).map((photo, index) => (
                          <img
                            key={index}
                            src={photo}
                            alt={`Training photo ${index + 1}`}
                            className="h-16 w-16 flex-shrink-0 rounded-lg object-cover"
                          />
                        ))}
                        {request.training_photos.length > 6 && (
                          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-secondary text-sm font-medium">
                            +{request.training_photos.length - 6}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && requests.length === 0 && models.length === 0 && (
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="text-center">
            <Users className="mx-auto h-16 w-16 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-bold">No tienes modelos aun</h2>
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

      {/* Create model form modal */}
      {showCreateForm && (
        <CreateModelForm
          onClose={() => setShowCreateForm(false)}
          onSuccess={() => {
            setShowCreateForm(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
