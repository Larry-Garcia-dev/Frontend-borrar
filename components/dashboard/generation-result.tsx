"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Download, RefreshCw, Image as ImageIcon, Flag, Edit3, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParticleLoader } from "@/components/ui/particle-loader";
import { ProtectedImage } from "@/components/protected-image";
import { useGenerationStore } from "@/lib/store/generation-store";

interface GenerationResultProps {
  onOpenReport: (mediaId: string) => void;
  onGenerateNew: () => void;
}

export function GenerationResult({ onOpenReport, onGenerateNew }: GenerationResultProps) {
  const { 
    isGenerating, progress, currentGeneration, 
    width, height, startEdit, setPrompt, generations, approveMedia 
  } = useGenerationStore();

  const isApproved = currentGeneration?.is_approved || false;

  const handleDownload = () => {
    if (!currentGeneration || !isApproved) return;
    const link = document.createElement("a");
    link.href = currentGeneration.storage_url;
    link.download = `macondo-${currentGeneration.id}.png`;
    link.click();
  };

  // Función restaurada para manejar la edición
  const handleStartEdit = (mediaId: string, editCount: number) => {
    // Buscamos en la galería o usamos la generación actual
    const media = generations.find((g) => g.id === mediaId) || currentGeneration;
    if (media) {
      setPrompt(`Editar: ${media.prompt}`);
      startEdit(mediaId, editCount);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="w-full lg:w-1/2">
      <Card className="h-full">
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
          <CardTitle className="text-lg sm:text-2xl">Resultado</CardTitle>
        </CardHeader>
        <CardContent className="px-4 sm:px-6">
          <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-secondary/50">
            <AnimatePresence mode="wait">
              {isGenerating ? (
                <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full items-center justify-center">
                  <ParticleLoader message="Creando tu imagen..." progress={progress} />
                </motion.div>
              ) : currentGeneration ? (
                <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="relative h-full">
                  <ProtectedImage
                    src={currentGeneration.storage_url}
                    alt={currentGeneration.prompt}
                    className="h-full w-full object-contain"
                    isApproved={isApproved}
                  />
                </motion.div>
              ) : (
                <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex h-full flex-col items-center justify-center p-8 text-center">
                  <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20">
                    <ImageIcon className="h-10 w-10 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">Tu imagen aparecerá aquí</h3>
                  <p className="mt-2 text-muted-foreground">Escribe un prompt y presiona generar</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {currentGeneration && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 space-y-4">
              
              {!isApproved ? (
                <div className="rounded-xl bg-amber-500/10 p-4 border border-amber-500/20">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-500 shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-foreground">Imagen protegida</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Debes aprobarla para descargarla. También puedes editarla o reportarla si hay un error.
                      </p>
                      
                      {/* AQUÍ ESTÁN RESTAURADOS LOS 3 BOTONES ORIGINALES */}
                      <div className="mt-3 sm:mt-4 grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                        <Button variant="default" size="sm" onClick={() => approveMedia(currentGeneration.id)} className="text-xs sm:text-sm">
                          <Check className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          <span className="hidden xs:inline">Aprobar</span>
                          <span className="xs:hidden">OK</span>
                        </Button>
                        
                        <Button variant="secondary" size="sm" className="text-xs sm:text-sm" onClick={() => handleStartEdit(currentGeneration.id, currentGeneration.edit_count)}>
                          <Edit3 className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          Editar
                        </Button>

                        <Button variant="destructive" size="sm" className="text-xs sm:text-sm" onClick={() => onOpenReport(currentGeneration.id)}>
                          <Flag className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                          Reportar
                        </Button>
                      </div>

                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Button variant="gradient" className="flex-1" onClick={handleDownload}>
                    <Download className="mr-2 h-4 w-4" /> Descargar Imagen
                  </Button>
                  <Button variant="secondary" onClick={onGenerateNew} disabled={isGenerating}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Generation info */}
              <div className="rounded-xl bg-secondary/50 p-4">
                <p className="text-sm text-muted-foreground">Prompt utilizado:</p>
                <p className="mt-1 text-base text-foreground">{currentGeneration.prompt}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                  <span className="rounded-md bg-background px-2 py-1">{width}x{height}</span>
                  <span className="rounded-md bg-background px-2 py-1">Ediciones: {currentGeneration.edit_count}</span>
                </div>
              </div>

            </motion.div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}