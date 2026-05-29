"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Lock, Download, Calendar, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeneratedMedia } from "@/lib/api-client";
import { ProtectedImage } from "@/components/protected-image";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { SessionGroup } from "./session-card";

interface SessionDetailModalProps {
  session: SessionGroup | null;
  onClose: () => void;
  onApprove: (mediaId: string) => void;
  onDownload: (image: GeneratedMedia) => void;
  onSelectImage: (image: GeneratedMedia) => void;
}

export function SessionDetailModal({ 
  session, 
  onClose, 
  onApprove,
  onDownload,
  onSelectImage 
}: SessionDetailModalProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  if (!session) return null;

  const selectedImage = selectedImageIndex !== null ? session.images[selectedImageIndex] : null;

  const handleImageClick = (image: GeneratedMedia, index: number) => {
    if (image.is_approved) {
      // Si está aprobada, abrir en el modal de detalle principal
      onSelectImage(image);
      onClose();
    } else {
      // Si no está aprobada, seleccionarla para ver más grande
      setSelectedImageIndex(index);
    }
  };

  const handleApproveSelected = () => {
    if (selectedImage) {
      onApprove(selectedImage.id);
      setSelectedImageIndex(null);
    }
  };

  const handleApproveAll = async () => {
    for (const image of session.images) {
      if (!image.is_approved) {
        onApprove(image.id);
      }
    }
  };

  const handleDownloadAll = () => {
    session.images.forEach((img, idx) => {
      if (img.is_approved) {
        setTimeout(() => onDownload(img), idx * 500);
      }
    });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl bg-card flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground line-clamp-1">
                {session.prompt}
              </h2>
              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {formatDate(session.createdAt)}
                </span>
                <span>{session.images.length} imágenes</span>
                <span className="text-green-500">
                  {session.approvedCount} aprobadas
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-full p-2 hover:bg-secondary transition-colors"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>

          {/* Contenido - Vista de imagen seleccionada o grid */}
          <div className="flex-1 overflow-y-auto p-4">
            {selectedImage ? (
              // Vista de imagen grande
              <div className="flex flex-col lg:flex-row gap-4 h-full">
                <div className="lg:w-2/3 relative rounded-xl overflow-hidden bg-black/50">
                  <ProtectedImage
                    src={selectedImage.storage_url}
                    alt={selectedImage.prompt}
                    className="w-full h-full object-contain max-h-[60vh]"
                    isApproved={selectedImage.is_approved}
                    watermarkText="macondo-ia.com"
                  />
                </div>
                <div className="lg:w-1/3 flex flex-col gap-4">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedImageIndex(null)}
                    className="w-full"
                  >
                    <ChevronLeft className="h-4 w-4 mr-2" />
                    Volver al grid
                  </Button>
                  
                  {!selectedImage.is_approved ? (
                    <Button
                      onClick={handleApproveSelected}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Aprobar imagen
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onDownload(selectedImage)}
                      className="w-full"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                  )}

                  <p className="text-sm text-muted-foreground">
                    {selectedImage.is_approved 
                      ? "Esta imagen está aprobada y lista para descargar."
                      : "Aprueba la imagen para poder descargarla sin marca de agua."}
                  </p>
                </div>
              </div>
            ) : (
              // Grid de todas las imágenes
              <div className={cn(
                "grid gap-3",
                session.images.length <= 4 ? "grid-cols-2 sm:grid-cols-4" :
                session.images.length <= 6 ? "grid-cols-2 sm:grid-cols-3" :
                "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              )}>
                {session.images.map((image, index) => (
                  <motion.button
                    key={image.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => handleImageClick(image, index)}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden border-2 transition-all group",
                      image.is_approved
                        ? "border-green-500/50 hover:border-green-500"
                        : "border-amber-500/30 hover:border-amber-500"
                    )}
                  >
                    <ProtectedImage
                      src={image.storage_url}
                      alt={image.prompt}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      isApproved={image.is_approved}
                      watermarkText="PROTEGIDO"
                    />

                    {/* Indicador de estado */}
                    <div className={cn(
                      "absolute top-2 right-2 rounded-full p-1.5",
                      image.is_approved ? "bg-green-500" : "bg-amber-500"
                    )}>
                      {image.is_approved 
                        ? <Check className="h-3 w-3 text-white" />
                        : <Lock className="h-3 w-3 text-white" />
                      }
                    </div>

                    {/* Número de imagen */}
                    <div className="absolute bottom-2 left-2 bg-black/70 rounded-full px-2 py-0.5 text-xs text-white font-medium">
                      {index + 1}
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {image.is_approved ? "Ver imagen" : "Aprobar"}
                      </span>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Footer con acciones */}
          {!selectedImage && (
            <div className="flex items-center justify-between p-4 border-t border-border bg-secondary/30">
              <div className="text-sm text-muted-foreground">
                {session.images.filter(i => !i.is_approved).length > 0 
                  ? `${session.images.filter(i => !i.is_approved).length} imágenes pendientes de aprobación`
                  : "Todas las imágenes están aprobadas"
                }
              </div>
              <div className="flex gap-2">
                {session.images.some(i => !i.is_approved) && (
                  <Button
                    variant="outline"
                    onClick={handleApproveAll}
                    className="border-green-500/50 text-green-500 hover:bg-green-500/10"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprobar todas
                  </Button>
                )}
                {session.approvedCount > 0 && (
                  <Button
                    variant="default"
                    onClick={handleDownloadAll}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Descargar aprobadas ({session.approvedCount})
                  </Button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
