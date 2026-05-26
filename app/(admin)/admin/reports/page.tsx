"use client";

import { useEffect, useState } from "react";
// [NUEVO] Importamos useMotionValue de framer-motion
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { 
  AlertTriangle, UserPlus, Check, X, DollarSign, 
  Image as ImageIcon, ZoomIn, ZoomOut, ChevronLeft, ChevronRight 
} from "lucide-react";
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

  // --- Estado para el Visualizador de Imágenes ---
  const [lightboxData, setLightboxData] = useState<{ photos: string[], index: number } | null>(null);
  const [zoomScale, setZoomScale] = useState(1);
  
  // [NUEVO] Valores de movimiento para controlar la posición (Pan/Drag)
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  // -----------------------------------------------------------

  useEffect(() => {
    fetchReports();
    fetchModelRequests();
  }, [fetchReports, fetchModelRequests]);

  // --- Funciones del Visualizador ---
  const handleOpenLightbox = (photos: string[], index: number) => {
    setLightboxData({ photos, index });
    setZoomScale(1);
    x.set(0); // Centrar imagen
    y.set(0); // Centrar imagen
    document.body.style.overflow = 'hidden'; 
  };

  const handleCloseLightbox = () => {
    setLightboxData(null);
    document.body.style.overflow = 'auto'; 
  };

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!lightboxData) return;
    const newIndex = (lightboxData.index - 1 + lightboxData.photos.length) % lightboxData.photos.length;
    setLightboxData({ ...lightboxData, index: newIndex });
    setZoomScale(1);
    x.set(0); // Centrar al cambiar
    y.set(0);
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!lightboxData) return;
    const newIndex = (lightboxData.index + 1) % lightboxData.photos.length;
    setLightboxData({ ...lightboxData, index: newIndex });
    setZoomScale(1);
    x.set(0); // Centrar al cambiar
    y.set(0);
  };

  const handleZoom = (type: 'in' | 'out', e?: React.MouseEvent) => {
    e?.stopPropagation();
    setZoomScale(prev => {
      const newZoom = type === 'in' ? prev + 0.5 : prev - 0.5;
      const clamped = Math.max(1, Math.min(newZoom, 4));
      // Si el zoom vuelve a 1x, centramos la imagen
      if (clamped === 1) {
        x.set(0);
        y.set(0);
      }
      return clamped;
    });
  };

  // [NUEVO] Función para hacer zoom con la rueda del ratón
  const handleWheel = (e: React.WheelEvent) => {
    // Evita propagar el scroll al fondo por seguridad
    e.stopPropagation(); 
    setZoomScale(prev => {
      // Si deltaY es negativo (scroll arriba) -> Zoom IN, sino Zoom OUT
      const zoomStep = e.deltaY < 0 ? 0.2 : -0.2; 
      const newZoom = prev + zoomStep;
      const clamped = Math.max(1, Math.min(newZoom, 4));
      
      // Resetear posición si vuelve al tamaño original
      if (clamped === 1) {
        x.set(0);
        y.set(0);
      }
      return clamped;
    });
  };
  // ---------------------------------------------

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
                        <div className="space-y-3 flex-1 min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold truncate">{req.model_name}</h3>
                            <span className={cn("px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap", 
                              req.status === "PENDING" ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
                            )}>
                              {req.status === "PENDING" ? "Revisión Pendiente" : "Pago Pendiente"}
                            </span>
                          </div>
                          
                          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-2 gap-y-1">
                            <span className="truncate">Email: {req.model_email}</span>
                            <span className="hidden sm:inline text-border">|</span>
                            <span>Tel: {req.model_phone}</span>
                          </div>
                          <div className="text-sm text-muted-foreground flex flex-wrap gap-x-2 gap-y-1">
                            <span className="truncate">Estudio ID: {req.studio_id.slice(0,8)}...</span>
                            <span className="hidden sm:inline text-border">|</span>
                            <span>Fecha: {formatDate(req.created_at)}</span>
                          </div>
                          
                          {req.model_info && (
                            <div className="mt-4 bg-muted/40 p-4 rounded-xl border border-border/50">
                              <h4 className="text-sm font-semibold mb-3 text-foreground">Información del Perfil</h4>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                <div>
                                  <span className="text-xs text-muted-foreground block truncate">Edad</span>
                                  <span className="text-sm font-medium">{String(req.model_info.age)} años</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block truncate">Género</span>
                                  <span className="text-sm font-medium capitalize truncate">{String(req.model_info.gender)}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block truncate">Etnia</span>
                                  <span className="text-sm font-medium capitalize truncate">{String(req.model_info.ethnicity)}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block truncate">Estatura</span>
                                  <span className="text-sm font-medium">{String(req.model_info.height_cm)} cm</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block truncate">Color Cabello</span>
                                  <span className="text-sm font-medium capitalize truncate">{String(req.model_info.hair_color)}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block truncate">Color Ojos</span>
                                  <span className="text-sm font-medium capitalize truncate">{String(req.model_info.eye_color)}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block truncate">Créditos</span>
                                  <span className="text-sm font-medium">{String(req.model_info.assigned_credits)}</span>
                                </div>
                                <div>
                                  <span className="text-xs text-muted-foreground block truncate">Límite Diario</span>
                                  <span className="text-sm font-medium">{String(req.model_info.assigned_daily_limit)}</span>
                                </div>
                                <div className="col-span-2 sm:col-span-3 md:col-span-4 mt-2">
                                  <span className="text-xs text-muted-foreground block mb-1">Biografía</span>
                                  <p className="text-sm bg-background p-2 rounded-md border text-muted-foreground italic break-words">
                                    {req.model_info.bio ? String(req.model_info.bio) : "Sin biografía..."}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}

                          {req.training_photos?.length > 0 && (
                            <div className="mt-4">
                              <span className="text-sm font-medium text-foreground mb-2 block">Fotos de Entrenamiento ({req.training_photos.length})</span>
                              <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                {req.training_photos.map((photo, i) => (
                                  <img 
                                    key={i} 
                                    src={photo} 
                                    alt="Training preview" 
                                    className="h-16 w-16 object-cover rounded-lg flex-shrink-0 border cursor-pointer hover:ring-2 hover:ring-primary transition-all" 
                                    onClick={() => handleOpenLightbox(req.training_photos, i)}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 w-full lg:w-48 shrink-0 justify-center lg:border-l lg:pl-6 mt-4 lg:mt-0">
                          {req.status === "PENDING" && (
                            <>
                              <Button variant="default" className="w-full bg-green-600 hover:bg-green-700 whitespace-nowrap" onClick={() => handleApproveModel(req.id)}>
                                <Check className="h-4 w-4 mr-2" /> Aprobar Perfil
                              </Button>
                              <Button variant="destructive" className="w-full whitespace-nowrap" onClick={() => setRejectingId(req.id)}>
                                <X className="h-4 w-4 mr-2" /> Rechazar
                              </Button>
                            </>
                          )}
                          {req.status === "PAYMENT_PENDING" && (
                            <Button variant="default" className="w-full bg-amber-600 hover:bg-amber-700 whitespace-nowrap" onClick={() => handleConfirmPayment(req.id)}>
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
                        
                        <div className="w-32 h-32 rounded-xl overflow-hidden shrink-0 border bg-secondary flex items-center justify-center self-center lg:self-start">
                          {report.storage_url ? (
                            <img 
                              src={report.storage_url} 
                              alt="Reported" 
                              className="w-full h-full object-cover cursor-pointer hover:opacity-80 transition-opacity" 
                              onClick={() => handleOpenLightbox([report.storage_url as string], 0)}
                            />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>

                        <div className="space-y-2 flex-1 min-w-0">
                          <h3 className="text-lg font-bold text-destructive flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5" /> Reporte de Calidad
                          </h3>
                          <div className="bg-destructive/10 p-4 rounded-lg mt-2 border border-destructive/20 break-words">
                            <p className="font-medium text-sm">Razón del usuario:</p>
                            <p className="text-sm mt-1">{report.reason}</p>
                          </div>
                          <p className="text-sm text-muted-foreground mt-2 truncate">
                            Media ID: <span className="font-mono text-xs">{report.media_id}</span>
                          </p>
                        </div>

                        <div className="flex flex-col gap-2 w-full lg:w-48 shrink-0 justify-center lg:border-l lg:pl-6">
                          <Button variant="outline" className="w-full text-green-500 border-green-500 hover:bg-green-500/10 whitespace-nowrap" onClick={() => handleApproveReport(report.id)}>
                            <Check className="h-4 w-4 mr-2" /> Aprobar y Reembolsar
                          </Button>
                          <Button variant="destructive" className="w-full whitespace-nowrap" onClick={() => setRejectingId(report.id)}>
                            <X className="h-4 w-4 mr-2" /> Rechazar Reporte
                          </Button>
                        </div>
                      </div>

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

      {/* --- VISUALIZADOR (LIGHTBOX) FINAL REPARADO --- */}
      <AnimatePresence>
        {lightboxData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            // Fondo oscuro difuminado (Escucha el scroll aquí)
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center backdrop-blur-sm p-4 md:p-10 select-none"
            onWheel={handleWheel} 
            // NUEVO: Solo cerrar si se hace click directamente en el fondo negro, no en hijos
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseLightbox();
              }
            }}
          >
            {/* CAPA DE CONTROLES (UI): Z-Index superior */}
            <div className="absolute inset-0 z-50 pointer-events-none flex flex-col justify-between p-5">
              {/* Top Bar */}
              <div className="flex justify-between items-center w-full pointer-events-auto">
                {/* Controles de Zoom */}
                <div className="flex gap-2 bg-black/30 p-1.5 rounded-full backdrop-blur-sm border">
                  <button 
                    className="p-2 rounded-full text-white hover:bg-white/10 transition-colors disabled:opacity-40"
                    onClick={(e) => handleZoom('in', e)}
                    disabled={zoomScale >= 4}
                  >
                    <ZoomIn className="h-6 w-6" />
                  </button>
                  <button 
                    className="p-2 rounded-full text-white hover:bg-white/10 transition-colors disabled:opacity-40"
                    onClick={(e) => handleZoom('out', e)}
                    disabled={zoomScale <= 1}
                  >
                    <ZoomOut className="h-6 w-6" />
                  </button>
                </div>

                {/* Botón Cerrar */}
                <button 
                  className="bg-black/30 p-2.5 rounded-full text-white hover:bg-white/10 transition-colors backdrop-blur-sm border"
                  onClick={handleCloseLightbox}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Botones de Navegación laterales (interrumpen el drag si están encima) */}
              {lightboxData.photos.length > 1 && (
                <>
                  <button 
                    className="absolute left-5 top-1/2 -translate-y-1/2 z-50 bg-black/60 p-4 rounded-full text-white hover:bg-black/90 transition-colors pointer-events-auto border"
                    onClick={handlePrevPhoto}
                  >
                    <ChevronLeft className="h-8 w-8" />
                  </button>
                  <button 
                    className="absolute right-5 top-1/2 -translate-y-1/2 z-50 bg-black/60 p-4 rounded-full text-white hover:bg-black/90 transition-colors pointer-events-auto border"
                    onClick={handleNextPhoto}
                  >
                    <ChevronRight className="h-8 w-8" />
                  </button>
                </>
              )}

              {/* Bottom Bar: Contador */}
              {lightboxData.photos.length > 1 && (
                <div className="flex justify-center w-full">
                  <div className="bg-black/50 px-5 py-2 rounded-full text-white text-sm font-medium border">
                    {lightboxData.index + 1} / {lightboxData.photos.length}
                  </div>
                </div>
              )}
            </div>

            {/* CAPA DE IMAGEN: Z-Index intermedio para captura de DRAG */}
            {/* Este contenedor ocupa todo el ancho y alto disponible para capturar clicks de cierre */}
            <div 
              className="w-full h-full flex items-center justify-center overflow-hidden relative z-10"
              onClick={handleCloseLightbox} // Click en el "vacío" de esta capa cierra
            >
              <motion.img
                key={lightboxData.index} 
                src={lightboxData.photos[lightboxData.index]}
                alt="Visualización a tamaño completo"
                
                style={{ x, y }}
                drag={zoomScale > 1}
                // NUEVO: Limitamos el arrastre para que no se pierda la imagen
                dragConstraints={{ left: -1500, right: 1500, top: -1500, bottom: 1500 }}
                dragElastic={0.1}
                dragMomentum={false} 

                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ 
                  scale: zoomScale,
                  opacity: 1,
                  transition: { type: "spring", stiffness: 300, damping: 30 }
                }}
                exit={{ scale: 0.8, opacity: 0 }}
                
                draggable={false}
                className={cn(
                  "max-w-full max-h-full object-contain shadow-2xl rounded-lg origin-center",
                  zoomScale > 1 ? "cursor-grab active:cursor-grabbing" : "cursor-default"
                )}
                
                // NUEVO: Importante para que el click en la imagen NO CIERRE
                onClick={(e) => e.stopPropagation()} 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}