"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Download, 
  RefreshCw, 
  Image as ImageIcon, 
  Flag, 
  Check, 
  AlertTriangle,
  Copy,
  ChevronDown,
  Info,
  Edit3
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ParticleLoader } from "@/components/ui/particle-loader";
import { ProtectedImage } from "@/components/protected-image";
import { EditModal } from "./edit-modal";
import { useGenerationStore } from "@/lib/store/generation-store";
import { cn } from "@/lib/utils";

interface GenerationResultProps {
  onOpenReport: (mediaId: string) => void;
  onGenerateNew: () => void;
}

export function GenerationResult({ onOpenReport, onGenerateNew }: GenerationResultProps) {
  const { 
    isGenerating, 
    progress, 
    currentGeneration, 
    width, 
    height, 
    approveMedia,
    generateEdit,
    isExplicitMode
  } = useGenerationStore();

  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  const isApproved = currentGeneration?.is_approved || false;

  const handleDownload = () => {
    if (!currentGeneration || !isApproved) return;
    const link = document.createElement("a");
    link.href = currentGeneration.storage_url;
    link.download = `macondo-${currentGeneration.id}.png`;
    link.click();
  };

  const handleCopyPrompt = () => {
    if (currentGeneration?.prompt) {
      navigator.clipboard.writeText(currentGeneration.prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const handleGenerateEdit = async (hiddenPrompt: string, clothingText: string, newWidth: number, newHeight: number) => {
    if (!currentGeneration) return;
    await generateEdit(currentGeneration.id, hiddenPrompt, clothingText, newWidth, newHeight);
  };

  // Estado vacío - sin generación
  if (!isGenerating && !currentGeneration) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        transition={{ delay: 0.2 }} 
        className="w-full lg:w-1/2"
      >
        <div className="flex h-full min-h-[500px] items-center justify-center rounded-2xl border border-border bg-card/50">
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20">
              <ImageIcon className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-foreground">Tu imagen aparecerá aquí</h3>
            <p className="mt-2 text-muted-foreground">Escribe un prompt y presiona generar</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Estado de carga
  if (isGenerating && !currentGeneration) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        transition={{ delay: 0.2 }} 
        className="w-full lg:w-1/2"
      >
        <div className="flex h-full min-h-[500px] items-center justify-center rounded-2xl border border-border bg-card/50">
          <ParticleLoader message="Creando tu imagen..." progress={progress} />
        </div>
      </motion.div>
    );
  }

  // Vista con imagen generada - Layout de 2 columnas
  return (
    <>
      <motion.div 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        transition={{ delay: 0.2 }} 
        className="w-full lg:w-1/2"
      >
        <div className="flex flex-col lg:flex-row gap-4 h-full">
          {/* Columna izquierda - Imagen (65%) */}
          <div className="lg:w-[65%] flex flex-col">
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-secondary/30">
              <AnimatePresence mode="wait">
                {currentGeneration && (
                  <motion.div 
                    key="result" 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.95 }} 
                    className="relative h-full min-h-[400px] lg:min-h-[500px]"
                  >
                    <ProtectedImage
                      src={currentGeneration.storage_url}
                      alt={currentGeneration.prompt}
                      className="h-full w-full object-contain"
                      isApproved={isApproved}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Columna derecha - Panel de información (35%) */}
          <div className="lg:w-[35%] flex flex-col gap-4">
            {/* Sección PROMPT */}
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-muted-foreground tracking-wider">PROMPT</span>
                <button
                  onClick={handleCopyPrompt}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="h-3 w-3" />
                      Copiado
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      Copiar
                    </>
                  )}
                </button>
              </div>
              <p className="text-sm text-foreground leading-relaxed line-clamp-4">
                {currentGeneration?.prompt}
              </p>
            </div>

            {/* Sección INFORMACIÓN */}
            <div className="rounded-xl border border-border bg-card p-4">
              <button
                onClick={() => setIsInfoExpanded(!isInfoExpanded)}
                className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground tracking-wider hover:text-foreground transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  INFORMACIÓN
                </span>
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform",
                  isInfoExpanded && "rotate-180"
                )} />
              </button>
              
              <AnimatePresence>
                {isInfoExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Modelo</span>
                        <span className="text-sm font-medium text-foreground">Macondo AI</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Calidad</span>
                        <span className="text-sm font-medium text-primary">1k</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tamaño</span>
                        <span className="text-sm font-medium text-foreground">{width}x{height}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Ediciones</span>
                        <span className="text-sm font-medium text-foreground">
                          {currentGeneration?.edit_count || 0} / 2
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Advertencia de imagen protegida */}
            {!isApproved && currentGeneration && (
              <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium text-foreground text-sm">Imagen protegida</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Aprueba para descargar o reporta si hay errores
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Sección ACCIONES */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              {!isApproved ? (
                <>
                  <Button 
                    variant="default" 
                    className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
                    onClick={() => currentGeneration && approveMedia(currentGeneration.id)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Aprobar imagen
                  </Button>
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={() => setShowEditModal(true)}
                    disabled={(currentGeneration?.edit_count || 0) >= 2}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Editar imagen
                    {(currentGeneration?.edit_count || 0) >= 2 && (
                      <span className="ml-2 text-xs opacity-70">(límite alcanzado)</span>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => currentGeneration && onOpenReport(currentGeneration.id)}
                  >
                    <Flag className="mr-2 h-4 w-4" />
                    Reportar problema
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    variant="gradient" 
                    className="w-full"
                    onClick={handleDownload}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar imagen
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={onGenerateNew}
                    disabled={isGenerating}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Nueva generación
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal de edición */}
      {currentGeneration && (
        <EditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          image={currentGeneration}
          onGenerate={handleGenerateEdit}
          maxEdits={2}
          isExplicit={isExplicitMode}
        />
      )}
    </>
  );
}
