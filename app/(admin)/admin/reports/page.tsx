"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, UserPlus, Check, X, DollarSign, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAdminStore } from "@/lib/store/admin-store";
import { formatDate, cn } from "@/lib/utils";

export default function AdminReportsPage() {
  const { 
    reports, 
    modelRequests, 
    isLoading, 
    fetchReports, 
    fetchModelRequests, 
    approveReport, 
    rejectReport,
    approveModelRequest,
    rejectModelRequest,
    confirmModelPayment
  } = useAdminStore();

  const [activeTab, setActiveTab] = useState<"models" | "reports">("models");
  const [rejectReason, setRejectReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  useEffect(() => {
    fetchReports();
    fetchModelRequests();
  }, [fetchReports, fetchModelRequests]);

  const handleApproveModel = async (id: string) => {
    if(confirm("¿Estás seguro de aprobar la creación de esta modelo?")) {
      await approveModelRequest(id);
    }
  };

  const handleConfirmPayment = async (id: string) => {
    if(confirm("¿Confirmas que has recibido el pago por la creación de este perfil?")) {
      await confirmModelPayment(id);
    }
  };

  const handleRejectModel = async () => {
    if (!rejectingId || !rejectReason.trim()) return;
    await rejectModelRequest(rejectingId, rejectReason);
    setRejectingId(null);
    setRejectReason("");
  };

  const handleApproveReport = async (id: string) => {
    if(confirm("¿Aprobar reporte y reembolsar crédito al usuario?")) {
      await approveReport(id);
    }
  };

  const handleRejectReport = async (id: string) => {
    if(confirm("¿Rechazar este reporte? (No se reembolsará crédito)")) {
      await rejectReport(id, "Reporte rechazado por el administrador.");
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Tabs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Solicitudes y Reportes</h1>
          <p className="mt-2 text-lg text-muted-foreground">Supervisa la creación de modelos y la calidad de imágenes</p>
        </div>

        <div className="flex gap-2 p-1 bg-secondary rounded-xl w-fit">
          <button
            onClick={() => setActiveTab("models")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "models" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <UserPlus className="h-4 w-4" />
            Nuevas Modelos
            {modelRequests.length > 0 && (
              <span className="ml-2 bg-primary text-white text-xs px-2 py-0.5 rounded-full">{modelRequests.length}</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              activeTab === "reports" ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <AlertTriangle className="h-4 w-4" />
            Reportes de Imágenes
            {reports.length > 0 && (
              <span className="ml-2 bg-destructive text-white text-xs px-2 py-0.5 rounded-full">{reports.length}</span>
            )}
          </button>
        </div>
      </motion.div>

      {/* Content Area */}
      <div className="relative min-h-[400px]">
        {isLoading && (
           <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10 backdrop-blur-sm rounded-xl">
             <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
           </div>
        )}

        <AnimatePresence mode="wait">
          {/* TAB: Solicitudes de Modelos */}
          {activeTab === "models" && (
            <motion.div key="models" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="space-y-4">
              {modelRequests.length === 0 ? (
                <div className="text-center py-20 bg-card border rounded-2xl">
                  <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-xl font-semibold">No hay solicitudes de modelos</p>
                  <p className="text-muted-foreground mt-2">Los estudios no han enviado nuevas solicitudes.</p>
                </div>
              ) : (
                modelRequests.map((req) => (
                  <Card key={req.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-6">
                        <div className="space-y-3 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold">{req.model_name}</h3>
                            <span className={cn("px-3 py-1 rounded-full text-xs font-semibold", 
                              req.status === "PENDING" ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
                            )}>
                              {req.status === "PENDING" ? "Revisión Pendiente" : "Pago Pendiente"}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">Email: {req.model_email} | Estudio ID: {req.studio_id.slice(0,8)}...</p>
                          <p className="text-sm text-muted-foreground">Fecha: {formatDate(req.created_at)}</p>
                          
                          {/* Fotos Previas */}
                          {req.training_photos?.length > 0 && (
                            <div className="flex gap-2 mt-4 overflow-x-auto pb-2">
                              {req.training_photos.map((photo, i) => (
                                <img key={i} src={photo} alt="Training preview" className="h-16 w-16 object-cover rounded-lg flex-shrink-0 border" />
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 min-w-[200px] justify-center">
                          {req.status === "PENDING" && (
                            <>
                              <Button variant="default" className="w-full bg-green-600 hover:bg-green-700" onClick={() => handleApproveModel(req.id)}>
                                <Check className="h-4 w-4 mr-2" /> Aprobar Perfil
                              </Button>
                              <Button variant="destructive" className="w-full" onClick={() => setRejectingId(req.id)}>
                                <X className="h-4 w-4 mr-2" /> Rechazar
                              </Button>
                            </>
                          )}
                          {req.status === "PAYMENT_PENDING" && (
                            <Button variant="default" className="w-full bg-amber-600 hover:bg-amber-700" onClick={() => handleConfirmPayment(req.id)}>
                              <DollarSign className="h-4 w-4 mr-2" /> Confirmar Pago (${req.payment_amount_usd})
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Reject Form Inline */}
                      <AnimatePresence>
                        {rejectingId === req.id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-6 pt-4 border-t overflow-hidden">
                            <label className="block text-sm font-medium mb-2 text-destructive">Razón del rechazo:</label>
                            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full p-3 rounded-lg border bg-background mb-3" placeholder="Explica por qué se rechaza esta modelo..." rows={3} />
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancelar</Button>
                              <Button variant="destructive" onClick={handleRejectModel} disabled={!rejectReason.trim()}>Confirmar Rechazo</Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </CardContent>
                  </Card>
                ))
              )}
            </motion.div>
          )}

          {/* TAB: Reportes de Imágenes */}
          {activeTab === "reports" && (
            <motion.div key="reports" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-4">
              {reports.length === 0 ? (
                <div className="text-center py-20 bg-card border rounded-2xl">
                  <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-xl font-semibold">No hay imágenes reportadas</p>
                  <p className="text-muted-foreground mt-2">Todo está funcionando correctamente.</p>
                </div>
              ) : (
                reports.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row justify-between gap-6">
                        
                        {/* NUEVO: Imagen reportada */}
                        <div className="w-32 h-32 rounded-xl overflow-hidden shrink-0 border bg-secondary flex items-center justify-center">
                          {report.storage_url ? (
                            <img src={report.storage_url} alt="Reported" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>

                        <div className="space-y-2 flex-1">
                          <h3 className="text-lg font-bold text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Reporte de Calidad
                          </h3>
                          <div className="bg-destructive/10 p-4 rounded-lg mt-2 border border-destructive/20">
                            <p className="font-medium">Razón del usuario:</p>
                            <p className="text-sm mt-1">{report.reason}</p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2">
                            Media ID: <span className="font-mono">{report.media_id}</span>
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 min-w-[200px] justify-center lg:border-l lg:pl-6">
                          <Button variant="outline" className="w-full text-green-500 border-green-500 hover:bg-green-500/10" onClick={() => handleApproveReport(report.id)}>
                            <Check className="h-4 w-4 mr-2" /> Aprobar y Reembolsar
                          </Button>
                          <Button variant="destructive" className="w-full" onClick={() => setRejectingId(report.id)}>
                            <X className="h-4 w-4 mr-2" /> Rechazar Reporte
                          </Button>
                        </div>
                      </div>

                      {/* NUEVO: Formulario de rechazo de reporte */}
                      <AnimatePresence>
                        {rejectingId === report.id && (
                          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-6 pt-4 border-t overflow-hidden">
                            <label className="block text-sm font-medium mb-2 text-destructive">Justificación para rechazar el reporte:</label>
                            <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} className="w-full p-3 rounded-lg border bg-background mb-3" placeholder="Explica por qué la imagen no tiene problemas..." rows={2} />
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" onClick={() => { setRejectingId(null); setRejectReason(""); }}>Cancelar</Button>
                              <Button variant="destructive" onClick={async () => {
                                await rejectReport(report.id, rejectReason);
                                setRejectingId(null);
                                setRejectReason("");
                              }} disabled={!rejectReason.trim()}>
                                Confirmar Rechazo
                              </Button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                    </CardContent>
                  </Card>
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}