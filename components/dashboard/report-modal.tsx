"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Flag, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGenerationStore } from "@/lib/store/generation-store";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mediaId: string | null;
}

export function ReportModal({ isOpen, onClose, mediaId }: ReportModalProps) {
  const { reportMedia } = useGenerationStore();
  const [reportReason, setReportReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!mediaId || !reportReason.trim()) return;
    setIsSubmitting(true);
    try {
      await reportMedia(mediaId, reportReason.trim());
      setSuccess(true);
      setTimeout(() => {
        onClose();
        // Reset local state after closing animation
        setTimeout(() => { setSuccess(false); setReportReason(""); }, 300);
      }, 1500);
    } catch {
      // Errors handled by the store
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl"
          >
            {success ? (
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-500/10">
                  <Check className="h-8 w-8 text-green-500" />
                </div>
                <h3 className="text-xl font-semibold text-foreground">Reporte enviado</h3>
                <p className="mt-2 text-muted-foreground">Gracias por tu retroalimentación. Revisaremos tu reporte.</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
                    <Flag className="h-5 w-5 text-destructive" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Reportar imagen</h3>
                    <p className="text-sm text-muted-foreground">Describe el problema con esta imagen</p>
                  </div>
                </div>
                <textarea
                  value={reportReason}
                  onChange={(e) => setReportReason(e.target.value)}
                  placeholder="Ej: La imagen no corresponde al prompt, tiene errores visuales, etc."
                  className="h-32 w-full resize-none rounded-xl border-2 border-input bg-card p-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" className="flex-1" onClick={onClose}>Cancelar</Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleSubmit}
                    disabled={!reportReason.trim() || isSubmitting}
                    isLoading={isSubmitting}
                  >
                    Enviar reporte
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}