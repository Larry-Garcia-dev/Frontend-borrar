"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Download, Edit3, Flag, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GeneratedMedia } from "@/lib/api-client";
import { formatDate } from "@/lib/utils";
import { ProtectedImage } from "@/components/protected-image";
import { EditModal } from "@/components/dashboard/edit-modal";
import { useGenerationStore } from "@/lib/store/generation-store";

interface ImageDetailModalProps {
  image: GeneratedMedia | null;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReport: (id: string) => void;
  onDownload: (image: GeneratedMedia) => void;
}

export function ImageDetailModal({ image, onClose, onApprove, onReport, onDownload }: ImageDetailModalProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const { generateEdit } = useGenerationStore();

  if (!image) return null;

  const handleGenerateEdit = async (hiddenPrompt: string, clothingText: string, width: number, height: number) => {
    await generateEdit(image.id, hiddenPrompt, clothingText, width, height);
    setShowEditModal(false);
    onClose();
  };

  const canEdit = (image.edit_count || 0) < 2;

  return (
    <>
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-2xl bg-card flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Image Side */}
            <div className="relative w-full md:w-1/2 aspect-square bg-black shrink-0">
              <ProtectedImage
                src={image.storage_url}
                alt={image.prompt}
                className="h-full w-full object-contain"
                isApproved={image.is_approved}
                watermarkText="macondo-ia.com"
              />
            </div>

            {/* Details Side */}
            <div className="flex flex-col p-6 w-full md:w-1/2 overflow-y-auto">
              <h3 className="mb-4 text-2xl font-bold text-foreground">Detalles de la imagen</h3>

              <div className="flex-1 space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Prompt</p>
                  <p className="mt-1 text-base text-foreground">{image.prompt}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg bg-secondary p-3">
                    <p className="text-xs text-muted-foreground">Tipo</p>
                    <p className="text-base font-medium text-foreground">{image.media_type}</p>
                  </div>
                  <div className="rounded-lg bg-secondary p-3">
                    <p className="text-xs text-muted-foreground">Ediciones</p>
                    <p className="text-base font-medium text-foreground">{image.edit_count} / 2</p>
                  </div>
                  <div className="col-span-2 rounded-lg bg-secondary p-3">
                    <p className="text-xs text-muted-foreground">Fecha</p>
                    <p className="text-base font-medium text-foreground">{formatDate(image.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-3">
                {!image.is_approved ? (
                  <div className="rounded-xl bg-amber-500/10 p-4 border border-amber-500/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">Imagen protegida</p>
                        <p className="mt-1 text-sm text-muted-foreground">Debes aprobarla para descargarla. También puedes editarla o reportarla.</p>
                        <div className="mt-3 grid grid-cols-3 gap-2">
                          <Button variant="default" size="sm" onClick={() => onApprove(image.id)}>
                            <Check className="mr-1 h-3 w-3" /> Aprobar
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            onClick={() => setShowEditModal(true)}
                            disabled={!canEdit}
                          >
                            <Edit3 className="mr-1 h-3 w-3" /> Editar
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => onReport(image.id)}>
                            <Flag className="mr-1 h-3 w-3" /> Reportar
                          </Button>
                        </div>
                        {!canEdit && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Límite de ediciones alcanzado
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <Button variant="gradient" className="w-full" onClick={() => onDownload(image)}>
                      <Download className="mr-2 h-5 w-5" /> Descargar
                    </Button>
                    <div className="flex gap-3">
                      <Button 
                        variant="secondary" 
                        className="flex-1" 
                        onClick={() => setShowEditModal(true)}
                        disabled={!canEdit}
                      >
                        <Edit3 className="mr-2 h-4 w-4" /> 
                        Editar
                        {!canEdit && <span className="ml-1 text-xs opacity-70">(límite)</span>}
                      </Button>
                      <Button variant="destructive" className="flex-1" onClick={() => onReport(image.id)}>
                        <Flag className="mr-2 h-4 w-4" /> Reportar
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      </AnimatePresence>

      {/* Modal de edición */}
      <EditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        image={image}
        onGenerate={handleGenerateEdit}
        maxEdits={2}
      />
    </>
  );
}
