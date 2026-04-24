"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, Clock, CheckCircle, XCircle, AlertCircle, Edit, Power, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreateModelForm } from "@/components/studio/create-model-form";
import { api, ModelCreationRequest, ModelProfile } from "@/lib/api-client";
import { useAuthStore } from "@/lib/store/auth-store";
import { formatDate, cn } from "@/lib/utils";
import { toast } from "sonner";

// ... (status configs de tu versión anterior se mantienen igual)
const profileStatusConfig: Record<string, any> = {
  PENDING: { icon: Clock, color: "text-blue-500", label: "Entrenando" },
  APPROVED: { icon: CheckCircle, color: "text-green-500", label: "Aprobado" },
  ACTIVE: { icon: CheckCircle, color: "text-green-500", label: "Activo" },
  SUSPENDED: { icon: AlertCircle, color: "text-red-500", label: "Congelado" },
};

export default function StudioPage() {
  const { user } = useAuthStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [requests, setRequests] = useState<ModelCreationRequest[]>([]);
  const [models, setModels] = useState<ModelProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados del Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedModel, setSelectedModel] = useState<ModelProfile | null>(null);
  const [newQuota, setNewQuota] = useState<number>(0);

  const isStudio = user?.isStudioAdmin || user?.isMacondoAdmin;

  // CÁLCULO DE CRÉDITOS DISPONIBLES
  const totalAssignedModels = models.reduce((acc, m) => acc + m.images_per_order, 0);
  const totalPendingRequests = requests
    .filter(r => ["PENDING", "PAYMENT_PENDING"].includes(r.status))
    .reduce((acc, r) => acc + (Number(r.model_info?.assigned_daily_limit) || 0), 0);
  
  const availableCredits = Math.max(0, (user?.dailyLimit || 0) - (totalAssignedModels + totalPendingRequests));

  useEffect(() => {
    if (isStudio) loadData();
  }, [isStudio]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [requestsData, modelsData] = await Promise.all([api.getMyModelRequests(), api.getMyModels()]);
      setRequests(requestsData); setModels(modelsData);
    } catch (error) { toast.error("Error cargando el estudio"); } 
    finally { setIsLoading(false); }
  };

  const handleEditClick = (model: ModelProfile) => {
    setSelectedModel(model);
    setNewQuota(model.images_per_order);
    setShowEditModal(true);
  };

  const handleSaveQuota = async () => {
    if (!selectedModel) return;
    const difference = newQuota - selectedModel.images_per_order;
    if (difference > availableCredits) {
      return toast.error(`No tienes suficientes créditos. Solo tienes ${availableCredits} disponibles.`);
    }

    try {
      await api.updateVendorUser(selectedModel.user_id, { daily_limit: newQuota });
      toast.success("Cuota actualizada");
      setShowEditModal(false);
      loadData();
    } catch (error: any) { toast.error(error.message); }
  };

  const handleToggleStatus = async (modelId: string) => {
    try {
      await api.toggleModelStatus(modelId);
      toast.success("Estado actualizado");
      loadData();
    } catch (error: any) { toast.error(error.message); }
  };

  const handleDeleteModel = async (userId: string) => {
    if (confirm("¿Estás seguro de que deseas borrar esta modelo? Sus créditos se liberarán.")) {
      try {
        await api.deleteVendorUser(userId);
        toast.success("Modelo borrada");
        loadData();
      } catch (error: any) { toast.error(error.message); }
    }
  };

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center bg-secondary/30 p-6 rounded-2xl border">
        <div>
          <h1 className="text-3xl font-bold">Mis Modelos</h1>
          <p className="text-muted-foreground">Créditos Totales del Estudio: <strong>{user?.dailyLimit}</strong></p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Créditos Disponibles para asignar</p>
          <p className="text-3xl font-bold text-primary">{availableCredits}</p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button variant="gradient" onClick={() => setShowCreateForm(true)}>
          <Plus className="h-5 w-5 mr-2" /> Crear Nuevo Modelo
        </Button>
      </div>

      {/* Grid de Modelos Activos */}
      {models.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {models.map((model) => {
            const status = profileStatusConfig[model.status] || profileStatusConfig.PENDING;
            return (
              <motion.div key={model.id} className="rounded-xl border bg-card shadow-sm flex flex-col">
                <div className="flex p-4 gap-4 border-b border-border/50">
                  {model.training_photos?.length > 0 ? (
                    <img src={model.training_photos[0]} className="h-20 w-20 rounded-lg object-cover border" />
                  ) : (
                    <div className="h-20 w-20 bg-secondary flex items-center justify-center"><Users className="h-8 w-8 text-muted-foreground" /></div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-bold text-lg truncate">{model.display_name}</h3>
                    <div className={cn("flex items-center gap-1 text-sm font-medium mt-1", status.color)}>
                      <status.icon className="h-4 w-4" /> <span>{status.label}</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-secondary/30 space-y-4 flex-1 flex flex-col justify-end">
                  <div className="flex justify-between bg-background p-2 rounded-lg border">
                    <span className="text-muted-foreground text-sm">Cuota diaria asignada:</span>
                    <span className="font-bold">{model.images_per_order}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEditClick(model)}>
                      <Edit className="h-4 w-4" /> <span className="hidden xs:inline ml-2">Cuota</span>
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleToggleStatus(model.id)}>
                      <Power className={cn("h-4 w-4", ["ACTIVE", "APPROVED", "READY"].includes(model.status) ? "text-green-500" : "text-amber-500")} />
                      <span className="hidden xs:inline ml-2">{["ACTIVE", "APPROVED", "READY"].includes(model.status) ? "Congelar" : "Activar"}</span>
                    </Button>
                    <Button variant="outline" size="sm" className="hover:bg-destructive/10 text-destructive" onClick={() => handleDeleteModel(model.user_id)}>
                      <Trash2 className="h-4 w-4" /> <span className="hidden xs:inline ml-2">Borrar</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Modal Formulario */}
      <AnimatePresence>
        {showCreateForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border bg-card p-6 shadow-xl">
              <div className="mb-4 flex justify-between"><h2 className="text-2xl font-bold">Crear Modelo</h2><Button variant="ghost" size="icon" onClick={() => setShowCreateForm(false)}><XCircle /></Button></div>
              <CreateModelForm availableCredits={availableCredits} onSuccess={() => { setShowCreateForm(false); loadData(); }} />
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Edición de Cuota */}
      <AnimatePresence>
        {showEditModal && selectedModel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }} className="w-full max-w-sm rounded-2xl border bg-card p-6 shadow-xl">
              <h3 className="text-xl font-bold mb-2">Editar Cuota de {selectedModel.display_name}</h3>
              <div className="space-y-4 mt-4">
                <Input type="number" min={1} value={newQuota} onChange={(e) => setNewQuota(Number(e.target.value))} />
                <p className="text-xs text-muted-foreground">Créditos adicionales disponibles: {availableCredits}</p>
                <div className="flex justify-end gap-3"><Button variant="outline" onClick={() => setShowEditModal(false)}>Cancelar</Button><Button onClick={handleSaveQuota}>Guardar</Button></div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}