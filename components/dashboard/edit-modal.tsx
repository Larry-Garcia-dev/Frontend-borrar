"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Sparkles, 
  Shirt, 
  Sun, 
  Maximize,
  Wand2,
  Check,
  AlertCircle,
  PenLine
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ProtectedImage } from "@/components/protected-image";
import { GeneratedMedia } from "@/lib/api-client";
import { cn } from "@/lib/utils";

// Opciones de edición con prompts ocultos - versión normal
const EDIT_OPTIONS_NORMAL = [
  {
    id: "piel-suave",
    label: "Piel suave",
    icon: Sparkles,
    description: "Suaviza la textura de la piel",
    hiddenPrompt: "Apply soft skin filter, smooth skin texture, reduce blemishes and imperfections, maintain natural look, soft focus on skin areas",
  },
  {
    id: "piel-realista",
    label: "Piel realista",
    icon: Wand2,
    description: "Mejora el realismo de la piel",
    hiddenPrompt: "Enhance skin realism, add natural skin texture and pores, realistic skin tones, photorealistic skin details, natural lighting on skin",
  },
  {
    id: "mejorar-calidad",
    label: "Mejorar calidad",
    icon: Maximize,
    description: "Aumenta la resolución",
    hiddenPrompt: "Upscale image, enhance resolution, improve sharpness and clarity, high quality details, 4K enhancement",
  },
  {
    id: "cambiar-iluminacion",
    label: "Cambiar iluminación",
    icon: Sun,
    description: "Ajusta la luz de la imagen",
    hiddenPrompt: "Adjust lighting, enhance natural light, improve shadows and highlights, cinematic lighting, professional studio lighting",
  },
];

// Prompts base para modo explícito (se agregan a todas las opciones)
const EXPLICIT_POSITIVE_PROMPT = "fully nude, completely naked, no clothes, bare skin, nude body, exposed body, without any clothing or fabric";
const EXPLICIT_NEGATIVE_PROMPT = "clothing, clothes, dressed, fabric, shirt, pants, dress, underwear, bra, panties, bikini, swimsuit, lingerie, covered body, any garment";

// Opciones de edición con prompts ocultos - versión explícita (completamente desnudo)
const EDIT_OPTIONS_EXPLICIT = [
  {
    id: "piel-suave",
    label: "Piel suave",
    icon: Sparkles,
    description: "Suaviza la textura de la piel",
    hiddenPrompt: "Apply soft skin filter, smooth skin texture, reduce blemishes and imperfections, maintain natural look, soft focus on skin areas",
  },
  {
    id: "piel-realista",
    label: "Piel realista",
    icon: Wand2,
    description: "Mejora el realismo de la piel",
    hiddenPrompt: "Enhance skin realism, add natural skin texture and pores, realistic skin tones, photorealistic skin details, natural lighting on skin",
  },
  {
    id: "mejorar-calidad",
    label: "Mejorar calidad",
    icon: Maximize,
    description: "Aumenta la resolución",
    hiddenPrompt: "Upscale image, enhance resolution, improve sharpness and clarity, high quality details, 4K enhancement",
  },
  {
    id: "cambiar-iluminacion",
    label: "Cambiar iluminación",
    icon: Sun,
    description: "Ajusta la luz de la imagen",
    hiddenPrompt: "Adjust lighting, enhance natural light, improve shadows and highlights, cinematic lighting, professional studio lighting",
  },
];

// Opciones de tamaño
const SIZE_OPTIONS = [
  { id: "1080x1080", label: "1080x1080", ratio: "1:1", width: 1080, height: 1080 },
  { id: "1080x1350", label: "1080x1350", ratio: "4:5", width: 1080, height: 1350 },
  { id: "1200x630", label: "1200x630", ratio: "1.91:1", width: 1200, height: 630 },
  { id: "1024x1024", label: "1024x1024", ratio: "1:1", width: 1024, height: 1024 },
];

interface EditModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: GeneratedMedia;
  onGenerate: (hiddenPrompt: string, negativePrompt: string, clothingText: string, customPrompt: string, width: number, height: number, numImages: number) => Promise<void>;
  maxEdits?: number;
  isExplicit?: boolean;
}

export function EditModal({ 
  isOpen, 
  onClose, 
  image, 
  onGenerate,
  maxEdits = 2,
  isExplicit = false 
}: EditModalProps) {
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [clothingText, setClothingText] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedSize, setSelectedSize] = useState(SIZE_OPTIONS[0]);
  const [isGenerating, setIsGenerating] = useState(false);

  // Seleccionar las opciones de edición según el modo
  const EDIT_OPTIONS = isExplicit ? EDIT_OPTIONS_EXPLICIT : EDIT_OPTIONS_NORMAL;

  // Verificar si se pueden hacer más ediciones
  const editsRemaining = maxEdits - (image.edit_count || 0);
  const canEdit = editsRemaining > 0;

  const toggleOption = (optionId: string) => {
    setSelectedOptions(prev => 
      prev.includes(optionId) 
        ? prev.filter(id => id !== optionId)
        : [...prev, optionId]
    );
  };

  const handleGenerate = async () => {
    if (!canEdit) return;
    
    setIsGenerating(true);
    
    try {
      // Construir el prompt oculto combinando las opciones seleccionadas
      const selectedPrompts = EDIT_OPTIONS
        .filter(opt => selectedOptions.includes(opt.id))
        .map(opt => opt.hiddenPrompt);
      
      let hiddenPrompt = selectedPrompts.join(". ");
      let negativePrompt = "";
      
      // Si es modo explícito, agregar prompts de desnudo
      if (isExplicit) {
        hiddenPrompt = `${EXPLICIT_POSITIVE_PROMPT}. ${hiddenPrompt}`;
        negativePrompt = EXPLICIT_NEGATIVE_PROMPT;
      }
      
      // Generar 3 imágenes diferentes
      const numImages = 3;
      
      await onGenerate(hiddenPrompt, negativePrompt, clothingText, customPrompt, selectedSize.width, selectedSize.height, numImages);
      onClose();
    } catch (error) {
      console.error("[v0] Error generating edit:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const hasSelections = selectedOptions.length > 0 || clothingText.trim().length > 0 || customPrompt.trim().length > 0;

  if (!isOpen) return null;

  return (
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
          className="relative max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-2xl bg-card flex flex-col md:flex-row"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Botón cerrar */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Lado izquierdo - Imagen */}
          <div className="relative w-full md:w-1/2 aspect-square bg-black/50 shrink-0">
            <ProtectedImage
              src={image.storage_url}
              alt={image.prompt}
              className="h-full w-full object-contain"
              isApproved={false}
              watermarkText="macondo-ia.com"
            />
          </div>

          {/* Lado derecho - Opciones de edición */}
          <div className="flex flex-col p-6 w-full md:w-1/2 overflow-y-auto max-h-[60vh] md:max-h-none">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-foreground">Editar imagen</h3>
              <span className={cn(
                "text-xs px-2 py-1 rounded-full",
                canEdit 
                  ? "bg-primary/20 text-primary" 
                  : "bg-destructive/20 text-destructive"
              )}>
                {editsRemaining} ediciones restantes
              </span>
            </div>

            {!canEdit && (
              <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">
                  Has alcanzado el límite de ediciones para esta imagen
                </p>
              </div>
            )}

            {/* Opciones de edición rápida */}
            <div className="space-y-3 mb-6">
              <Label className="text-sm font-medium text-muted-foreground">
                Mejoras rápidas
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {EDIT_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = selectedOptions.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      onClick={() => toggleOption(option.id)}
                      disabled={!canEdit}
                      className={cn(
                        "relative flex flex-col items-start p-3 rounded-xl border transition-all text-left",
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border bg-secondary/30 hover:border-primary/50 hover:bg-secondary/50",
                        !canEdit && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn(
                          "h-4 w-4",
                          isSelected ? "text-primary" : "text-muted-foreground"
                        )} />
                        <span className={cn(
                          "text-sm font-medium",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {option.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {option.description}
                      </p>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-4 w-4 text-primary" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Edición personalizada por texto */}
            <div className="space-y-3 mb-6">
              <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <PenLine className="h-4 w-4" />
                Edición personalizada
              </Label>
              <Textarea
                placeholder="Escribe lo que quieres cambiar en la imagen. Ej: cambiar el fondo a una playa, agregar sonrisa, cambiar color de cabello..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={!canEdit}
                className="bg-secondary/30 border-border focus:border-primary min-h-[80px] resize-none"
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Describe con detalle los cambios que deseas realizar
              </p>
            </div>

            {/* Cambio de ropa - Solo visible en modo NO explícito */}
            {!isExplicit && (
              <div className="space-y-3 mb-6">
                <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shirt className="h-4 w-4" />
                  Cambio de ropa
                </Label>
                <Input
                  placeholder="Ej: vestido rojo elegante, bikini azul, lencería negra..."
                  value={clothingText}
                  onChange={(e) => setClothingText(e.target.value)}
                  disabled={!canEdit}
                  className="bg-secondary/30 border-border focus:border-primary"
                />
                <p className="text-xs text-muted-foreground">
                  Describe la ropa que deseas para la imagen
                </p>
              </div>
            )}

            {/* Tamaño de imagen */}
            <div className="space-y-3 mb-6">
              <Label className="text-sm font-medium text-muted-foreground">
                Tamaño de imagen
              </Label>
              <div className="grid grid-cols-2 gap-2">
                {SIZE_OPTIONS.map((size) => (
                  <button
                    key={size.id}
                    onClick={() => setSelectedSize(size)}
                    disabled={!canEdit}
                    className={cn(
                      "flex flex-col items-center p-3 rounded-xl border transition-all",
                      selectedSize.id === size.id
                        ? "border-primary bg-primary/10"
                        : "border-border bg-secondary/30 hover:border-primary/50",
                      !canEdit && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span className="text-sm font-medium text-foreground">
                      {size.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {size.ratio}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Botón generar */}
            <Button
              onClick={handleGenerate}
              disabled={!canEdit || !hasSelections || isGenerating}
              className="w-full bg-gradient-to-r from-primary to-accent hover:opacity-90 mt-auto"
            >
              {isGenerating ? (
                <>
                  <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Generando...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Generar edición
                </>
              )}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
