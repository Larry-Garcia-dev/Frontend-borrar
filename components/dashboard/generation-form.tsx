"use client";

import { motion } from "framer-motion";
import { Sparkles, Wand2, Upload, X, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGenerationStore } from "@/lib/store/generation-store";
import { useAuthStore } from "@/lib/store/auth-store";

const SIZE_OPTIONS = [
  { value: "1080x1080 (1:1)", label: "1080 x 1080 (Carrusel/Cuadrado 1:1)", width: 1080, height: 1080 },
  { value: "1080x1350 (4:5)", label: "1080 x 1350 (Vertical 4:5)", width: 1080, height: 1350 },
  { value: "1200x630 (16:9)", label: "1200 x 630 (Horizontal 16:9)", width: 1200, height: 630 },
  { value: "100x100 (1:1)", label: "100 x 100 (Destacado/Icono)", width: 100, height: 100 },
];

interface GenerationFormProps {
  onGenerateStart: () => void;
}

export function GenerationForm({ onGenerateStart }: GenerationFormProps) {
  const { user } = useAuthStore();
  const {
    prompt, setPrompt,
    width, height, setWidth, setHeight,
    selectedSize, setSelectedSize,
    isGenerating, error, generate, clearError,
    promptTemplates, templateId, setTemplateId,
    referenceImageUrls, setReferenceImageUrls, uploadReferenceImages,
    parentMediaId, parentEditCount, cancelEdit,
  } = useGenerationStore();
  const isModeloOrStudio = user?.role === "MODELO" || user?.role === "ESTUDIO_ADMIN" || user?.isStudioAdmin;
  const isEditing = !!parentMediaId;
  const editsRemaining = Math.max(0, 2 - parentEditCount);
  const editIsFree = parentEditCount < 2;

  const remainingCredits = user
    ? user.isUnlimited ? Infinity : user.dailyLimit - user.usedQuota
    : 0;

  const handleSizeChange = (value: string) => {
    setSelectedSize(value);
    const option = SIZE_OPTIONS.find((o) => o.value === value);
    if (option) {
      setWidth(option.width);
      setHeight(option.height);
    }
  };

  const handleTemplateChange = (templateName: string) => {
    if (templateName === "Sin plantilla" || !templateName) {
      setTemplateId(null);
      return;
    }
    const template = promptTemplates.find((t) => t.name === templateName);
    if (template) setTemplateId(template.id);
  };

  const handleGenerate = async () => {
    clearError();
    onGenerateStart(); // Resetea el estado de isApproved en el componente padre
    await generate();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await uploadReferenceImages(Array.from(files));
    }
    e.target.value = "";
  };

  return (
    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }} className="w-full lg:w-1/2">
      <Card className="h-full">
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-2xl">
              <Wand2 className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
              {isEditing ? "Editar imagen" : "Crear imagen"}
            </CardTitle>
            <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5 sm:px-4 sm:py-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-xs sm:text-sm font-medium">
                {user?.isUnlimited ? "Ilimitado" : remainingCredits} créditos
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
          {/* Edit mode banner */}
          {isEditing && (
            <div className="flex items-center justify-between rounded-lg bg-primary/10 p-4">
              <div className="flex items-center gap-3">
                <Edit3 className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium text-foreground">Modo edición</p>
                  <p className="text-sm text-muted-foreground">
                    {editIsFree ? `${editsRemaining} ediciones gratis restantes` : "Esta edición consumirá 1 crédito"}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={cancelEdit}>
                <X className="h-4 w-4" /> Cancelar
              </Button>
            </div>
          )}

          {/* 1. Prompt Principal */}
          <div className="space-y-2 sm:space-y-3">
            <label className="block text-base sm:text-lg font-semibold text-foreground">
              Describe tu imagen
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ej: Un paisaje mágico con montañas flotantes y auroras boreales..."
              className="h-28 sm:h-36 w-full resize-none rounded-xl border-2 border-input bg-card p-3 sm:p-4 text-base sm:text-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* 2. Selector de Plantillas (NUEVA FUNCIONALIDAD) */}
          {promptTemplates.length > 0 && (
            <div className="space-y-3">
              <label className="block text-base font-medium text-foreground">
                Plantilla de estilo (Opcional)
              </label>
              <select
                value={templateId ? promptTemplates.find((t) => t.id === templateId)?.name || "" : "Sin plantilla"}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Sin plantilla">Selecciona un estilo predefinido...</option>
                {promptTemplates.map((template) => (
                  <option key={template.id} value={template.name}>{template.name}</option>
                ))}
              </select>
              {templateId && (
                <p className="text-sm text-muted-foreground animate-in fade-in slide-in-from-top-1">
                  {promptTemplates.find((t) => t.id === templateId)?.description}
                </p>
              )}
            </div>
          )}

          {/* 3. Selector de Tamaño */}
          <div className="space-y-3">
            <label className="block text-base font-medium text-foreground">Tamaño de imagen</label>
            <select
              value={selectedSize}
              onChange={(e) => handleSizeChange(e.target.value)}
              className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {SIZE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* 4. Imágenes de Referencia */}
          {!isModeloOrStudio && (
            <div className="space-y-3">
              <label className="block text-base font-medium text-foreground">Imágenes de referencia (opcional)</label>
              <div className="flex flex-wrap gap-2">
                {referenceImageUrls.map((url, index) => (
                  <div key={index} className="relative h-16 w-16 overflow-hidden rounded-lg border border-border">
                    <img src={url} alt={`Reference ${index + 1}`} className="h-full w-full object-cover" />
                    <button
                      onClick={() => setReferenceImageUrls(referenceImageUrls.filter((_, i) => i !== index))}
                      className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {referenceImageUrls.length < 8 && (
                  <label className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border transition-colors hover:border-primary">
                    <Upload className="h-5 w-5 text-muted-foreground" />
                    <input type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={handleFileUpload} className="hidden" />
                  </label>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Máximo 8 imágenes. PNG, JPG o WEBP.</p>
            </div>
          )}

          {/* Error & Submit */}
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg bg-destructive/10 p-4 text-center text-destructive">
              {error}
            </motion.div>
          )}

          <Button
            variant="gradient"
            size="xl"
            className="w-full"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim() || (!user?.isUnlimited && !editIsFree && remainingCredits <= 0)}
            isLoading={isGenerating}
          >
            {!isGenerating && <Sparkles className="h-6 w-6" />}
            {isGenerating ? "Generando..." : isEditing ? "Generar edición" : "Generar Imagen"}
          </Button>

          {!user?.isUnlimited && !editIsFree && remainingCredits <= 0 && (
            <p className="text-center text-sm text-destructive">No tienes créditos disponibles. Contacta al administrador.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}