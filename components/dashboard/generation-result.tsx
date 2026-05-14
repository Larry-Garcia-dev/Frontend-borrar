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
  Edit3,
  CheckCircle
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
    currentGenerations,
    width, 
    height, 
    approveMedia,
    generateEdit,
    isExplicitMode
  } = useGenerationStore();

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isInfoExpanded, setIsInfoExpanded] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Usar currentGenerations si hay múltiples, sino currentGeneration
  const images = currentGenerations.length > 0 
    ? currentGenerations 
    : (currentGeneration ? [currentGeneration] : []);
  
  const selectedImage = images[selectedIndex] || null;
  const isApproved = selectedImage?.is_approved || false;

  const handleDownload = (imageIndex?: number) => {
    const image = imageIndex !== undefined ? images[imageIndex] : selectedImage;
    if (!image || !image.is_approved) return;
    const link = document.createElement("a");
    link.href = image.storage_url;
    link.download = `macondo-${image.id}.png`;
    link.click();
  };

  const handleCopyPrompt = () => {
    if (selectedImage?.prompt) {
      navigator.clipboard.writeText(selectedImage.prompt);
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    }
  };

  const handleApproveImage = async (index: number) => {
    const image = images[index];
    if (image) {
      await approveMedia(image.id);
    }
  };

  const handleGenerateEdit = async (hiddenPrompt: string, negativePrompt: string, clothingText: string, customPrompt: string, newWidth: number, newHeight: number, numImages: number) => {
    if (!selectedImage) return;
    await generateEdit(selectedImage.id, hiddenPrompt, negativePrompt, clothingText, customPrompt, newWidth, newHeight, numImages);
    setSelectedIndex(0); // Reset al primer resultado
  };

  // Estado vacío - sin generación
  if (!isGenerating && images.length === 0) {
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
            <h3 className="text-xl font-semibold text-foreground">Tu imagen aparecera aqui</h3>
            <p className="mt-2 text-muted-foreground">Escribe un prompt y presiona generar</p>
          </div>
        </div>
      </motion.div>
    );
  }

  // Estado de carga
  if (isGenerating && images.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        transition={{ delay: 0.2 }} 
        className="w-full lg:w-1/2"
      >
        <div className="flex h-full min-h-[500px] items-center justify-center rounded-2xl border border-border bg-card/50">
          <ParticleLoader message="Creando tus imagenes..." progress={progress} />
        </div>
      </motion.div>
    );
  }

  // Vista con imágenes generadas
  return (
    <>
      <motion.div 
        initial={{ opacity: 0, x: 20 }} 
        animate={{ opacity: 1, x: 0 }} 
        transition={{ delay: 0.2 }} 
        className="w-full lg:w-1/2"
      >
        <div className="flex flex-col lg:flex-row gap-4 h-full">
          {/* Columna izquierda - Imagen principal y miniaturas */}
          <div className="lg:w-[70%] flex flex-col gap-4">
            {/* Imagen principal seleccionada */}
            <div className="relative flex-1 overflow-hidden rounded-2xl border border-border bg-secondary/30">
              <AnimatePresence mode="wait">
                {selectedImage && (
                  <motion.div 
                    key={selectedImage.id} 
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.95 }} 
                    className="relative h-full min-h-[350px] lg:min-h-[400px]"
                  >
                    <ProtectedImage
                      src={selectedImage.storage_url}
                      alt={selectedImage.prompt}
                      className="h-full w-full object-contain"
                      isApproved={isApproved}
                    />
                    {/* Badge de selección */}
                    <div className="absolute top-3 left-3 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium">
                      Imagen {selectedIndex + 1} de {images.length}
                    </div>
                    {/* Badge de aprobación */}
                    {isApproved && (
                      <div className="absolute top-3 right-3 bg-green-500/90 backdrop-blur-sm rounded-full px-3 py-1 text-xs font-medium text-white flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        Aprobada
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Miniaturas de las imágenes - Grid adaptativo */}
            {images.length > 1 && (
              <div className={cn(
                "grid gap-2",
                images.length <= 3 ? "grid-cols-3" :
                images.length <= 6 ? "grid-cols-3 sm:grid-cols-4 lg:grid-cols-6" :
                "grid-cols-4 sm:grid-cols-5 lg:grid-cols-5"
              )}>
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => setSelectedIndex(index)}
                    className={cn(
                      "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                      selectedIndex === index 
                        ? "border-primary ring-2 ring-primary/30 scale-[1.02]" 
                        : "border-border hover:border-primary/50"
                    )}
                  >
                    <img
                      src={image.storage_url}
                      alt={`Opcion ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Overlay con número */}
                    <div className={cn(
                      "absolute top-1 left-1 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold",
                      selectedIndex === index 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-background/80 text-foreground"
                    )}>
                      {index + 1}
                    </div>
                    {/* Indicador de aprobación */}
                    {image.is_approved && (
                      <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Columna derecha - Panel de información */}
          <div className="lg:w-[30%] flex flex-col gap-4 overflow-y-auto max-h-[600px]">
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
                {selectedImage?.prompt}
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
                  INFORMACION
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
                        <span className="text-sm text-muted-foreground">Tamano</span>
                        <span className="text-sm font-medium text-foreground">{width}x{height}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Imagenes</span>
                        <span className="text-sm font-medium text-foreground">{images.length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Aprobadas</span>
                        <span className="text-sm font-medium text-green-500">
                          {images.filter(i => i.is_approved).length} / {images.length}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Advertencia de imagen protegida */}
            {!isApproved && selectedImage && (
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
                    onClick={() => handleApproveImage(selectedIndex)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    Aprobar imagen {selectedIndex + 1}
                  </Button>
                  
                  {/* Botón para aprobar todas */}
                  {images.length > 1 && images.some(i => !i.is_approved) && (
                    <Button 
                      variant="outline" 
                      className="w-full border-green-500/30 text-green-600 hover:bg-green-500/10"
                      onClick={async () => {
                        for (let i = 0; i < images.length; i++) {
                          if (!images[i].is_approved) {
                            await handleApproveImage(i);
                          }
                        }
                      }}
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Aprobar todas ({images.filter(i => !i.is_approved).length})
                    </Button>
                  )}
                  
                  <Button 
                    variant="secondary" 
                    className="w-full"
                    onClick={() => setShowEditModal(true)}
                    disabled={(selectedImage?.edit_count || 0) >= 2}
                  >
                    <Edit3 className="mr-2 h-4 w-4" />
                    Editar imagen
                    {(selectedImage?.edit_count || 0) >= 2 && (
                      <span className="ml-2 text-xs opacity-70">(limite alcanzado)</span>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => selectedImage && onOpenReport(selectedImage.id)}
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
                    onClick={() => handleDownload()}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Descargar imagen
                  </Button>
                  
                  {/* Descargar todas las aprobadas */}
                  {images.filter(i => i.is_approved).length > 1 && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => {
                        images.forEach((img, idx) => {
                          if (img.is_approved) {
                            setTimeout(() => handleDownload(idx), idx * 500);
                          }
                        });
                      }}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Descargar todas ({images.filter(i => i.is_approved).length})
                    </Button>
                  )}
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={onGenerateNew}
                    disabled={isGenerating}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Nueva generacion
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Modal de edición */}
      {selectedImage && (
        <EditModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          image={selectedImage}
          onGenerate={handleGenerateEdit}
          maxEdits={2}
          isExplicit={isExplicitMode}
        />
      )}
    </>
  );
}
