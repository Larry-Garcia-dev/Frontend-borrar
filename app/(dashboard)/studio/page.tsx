"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Power,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateModelForm } from "@/components/studio/create-model-form";
import { api, ModelCreationRequest, ModelProfile } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store/auth-store";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

// 1. Configuración de estados para las SOLICITUDES (Requests)
const requestStatusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  PENDING: { icon: Clock, color: "text-amber-500", label: "Pendiente de revisión" },
  PAYMENT_PENDING: { icon: AlertCircle, color: "text-orange-500", label: "Pendiente de pago" },
  COMPLETED: { icon: CheckCircle, color: "text-green-500", label: "Completado" },
  REJECTED: { icon: XCircle, color: "text-red-500", label: "Rechazado" },
};

// 2. Configuración de estados para los PERFILES DE MODELO (Profiles)
const profileStatusConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  PENDING: { icon: Clock, color: "text-blue-500", label: "Pendiente de Entrenamiento" },
  APPROVED: { icon: CheckCircle, color: "text-green-500", label: "Aprobado" },
  TRAINING: { icon: Clock, color: "text-blue-500", label: "En entrenamiento" },
  READY: { icon: CheckCircle, color: "text-green-500", label: "Listo para usar" },
  ACTIVE: { icon: CheckCircle, color: "text-green-500", label: "Activo" },
  REJECTED: { icon: XCircle, color: "text-red-500", label: "Rechazado" },
  SUSPENDED: { icon: AlertCircle, color: "text-red-500", label: "Suspendido" },
};

export default function StudioPage() {
  const { user } = useAuthStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [requests, setRequests] = useState<ModelCreationRequest[]>([]);
  const [models, setModels] = useState<ModelProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados para el Modal de Edición de Cuota
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelProfile | null>(null);
  const [newQuota, setNewQuota] = useState<number>(0);

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

  // --- Acciones de Gestión de Modelos ---

  const handleEditClick = (model: ModelProfile) => {
    setSelectedModel(model);
    setNewQuota(model.images_per_order);
    setShowEditModal(true);
  };

  const handleSaveQuota = async () => {
    if (!selectedModel) return;
    try {
      // Actualizamos la cuota del usuario usando el API de Vendor
      await api.updateVendorUser(selectedModel.user_id, { daily_limit: newQuota });
      toast.success("Cuota actualizada correctamente");
      setShowEditModal(false);
      loadData(); // Recargamos los datos para reflejar los cambios
    } catch (error: any) {
      toast.error(error.message || "Error al actualizar la cuota");
    }
  };

  const handleToggleStatus = async (modelId: string, currentStatus: string) => {
    toast.info("Función para pausar/activar en desarrollo");
    // Aquí iría la llamada al endpoint para alternar el status entre ACTIVE y SUSPENDED
  };

  const handleDeleteModel = async (userId: string) => {
    if (confirm("¿Estás seguro de que deseas eliminar este modelo? Esta acción no se puede deshacer y liberará los créditos de tu estudio.")) {
      try {
        await api.deleteVendorUser(userId);
        toast.success("Modelo eliminado exitosamente");
        loadData();
      } catch (error: any) {
        toast.error(error.message || "Error al eliminar el modelo");
      }
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
            Gestiona los perfiles y cuotas de tu estudio
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
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {models.map((model) => {
              const status = profileStatusConfig[model.status] || profileStatusConfig.PENDING;
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={model.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border bg-card shadow-sm overflow-hidden flex flex-col"
                >
                  {/* Info Superior */}
                  <div className="flex p-4 gap-4 border-b border-border/50">
                    {model.training_photos && model.training_photos.length > 0 ? (
                      <img
                        src={model.training_photos[0]}
                        alt={model.display_name}
                        className="h-20 w-20 rounded-lg object-cover border"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-secondary flex items-center justify-center">
                        <Users className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg truncate">{model.display_name}</h3>
                      <div className={`flex items-center gap-1 text-sm font-medium mt-1 ${status.color}`}>
                        <StatusIcon className="h-4 w-4" />
                        <span>{status.label}</span>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Creado el {formatDate(model.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Panel de Control (Inferior) */}
                  <div className="p-4 bg-secondary/30 space-y-4 flex-1 flex flex-col justify-end">
                    <div className="flex justify-between items-center text-sm bg-background/50 p-2 rounded-lg border">
                      <span className="text-muted-foreground">Cuota asignada:</span>
                      <span className="font-bold">{model.images_per_order} fotos/día</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full flex gap-2"
                        title="Editar Cuota"
                        onClick={() => handleEditClick(model)}
                      >
                        <Edit className="h-4 w-4" /> <span className="hidden xs:inline">Cuota</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full flex gap-2"
                        title={model.status === "ACTIVE" ? "Pausar Modelo" : "Activar Modelo"}
                        onClick={() => handleToggleStatus(model.id, model.status)}
                      >
                        <Power className={cn("h-4 w-4", model.status === "ACTIVE" ? "text-green-500" : "text-amber-500")} />
                        <span className="hidden xs:inline">{model.status === "ACTIVE" ? "Pausar" : "Activar"}</span>
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full flex gap-2 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                        title="Eliminar"
                        onClick={() => handleDeleteModel(model.user_id)}
                      >
                        <Trash2 className="h-4 w-4" /> <span className="hidden xs:inline">Borrar</span>
                      </Button>
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
              const status = requestStatusConfig[request.status] || requestStatusConfig.PENDING;
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

      {/* Modal: Create Model Form */}
      <AnimatePresence>
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
      </AnimatePresence>

      {/* Modal: Editar Cuota */}
      <AnimatePresence>
        {showEditModal && selectedModel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.95, opacity: 0 }} 
              className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl"
            >
              <h3 className="text-xl font-bold mb-2">Editar Cuota de Fotos</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Modifica el límite diario de fotos para <span className="font-bold text-foreground">{selectedModel.display_name}</span>.
              </p>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Límite Diario</label>
                  <Input 
                    type="number" 
                    min={1}
                    value={newQuota}
                    onChange={(e) => setNewQuota(Number(e.target.value))}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Límite global disponible: {user?.dailyLimit}
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button>
                  <Button variant="gradient" onClick={handleSaveQuota}>Guardar Cambios</Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}