"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Sparkles, Wand2, Upload, X, Edit3, Flame, Images, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useGenerationStore } from "@/lib/store/generation-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { api } from "@/lib/api-client";
import { ModelProfile } from "@/lib/api/types";
import { ExplicitGenerationForm } from "./explicit-generation-form";
// IMPORTANTE: Asegúrate de importar el componente implícito
import { ImplicitGenerationForm } from "./implicit-generation-form";

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
    isExplicitMode, setIsExplicitMode,
    numImages, setNumImages,
  } = useGenerationStore();
  
  const [modelProfile, setModelProfile] = useState<ModelProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  
  // Estado para Studio Admin - seleccion de modelos
  const [studioModels, setStudioModels] = useState<ModelProfile[]>([]);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [loadingModels, setLoadingModels] = useState(false);

  // NUEVO: Estado para manejar el modo implícito
  const [isImplicitMode, setIsImplicitMode] = useState(false);
  
  const isModelo = user?.role === "MODELO";
  const isStudioAdmin = user?.isStudioAdmin || user?.role === "ESTUDIO_ADMIN";
  const isModeloOrStudio = user?.role === "MODELO" || user?.role === "ESTUDIO_ADMIN" || user?.isStudioAdmin;
  const isEditing = !!parentMediaId;
  const editsRemaining = Math.max(0, 2 - parentEditCount);
  const editIsFree = parentEditCount < 2;

  // Cargar perfil del modelo para verificar si tiene contenido explicito
  useEffect(() => {
    const fetchProfile = async () => {
      if (isModelo) {
        setLoadingProfile(true);
        try {
          const profile = await api.getMyProfile();
          setModelProfile(profile);
        } catch {
          // Sin perfil de modelo
        } finally {
          setLoadingProfile(false);
        }
      }
    };
    fetchProfile();
  }, [isModelo]);

  // Cargar modelos del Studio Admin
  useEffect(() => {
    const fetchStudioModels = async () => {
      if (isStudioAdmin) {
        setLoadingModels(true);
        try {
          const models = await api.getMyModels();
          // Solo mostrar modelos activos que tengan fotos de entrenamiento
          const activeModels = models.filter(
            (m) => ["ACTIVE", "APPROVED", "READY"].includes(m.status) && m.training_photos?.length > 0
          );
          setStudioModels(activeModels);
        } catch {
          // Error cargando modelos
        } finally {
          setLoadingModels(false);
        }
      }
    };
    fetchStudioModels();
  }, [isStudioAdmin]);

  // Obtener el modelo seleccionado
  const selectedModel = studioModels.find((m) => m.id === selectedModelId);

  // Manejar seleccion de modelo
  const handleModelSelect = (modelId: string) => {
    setSelectedModelId(modelId);
    // Resetear ambos modos cuando cambia de modelo
    setIsExplicitMode(false);
    setIsImplicitMode(false);
    
    const model = studioModels.find((m) => m.id === modelId);
    if (model && model.training_photos?.length > 0) {
      // Usar las fotos de entrenamiento como referencia
      setReferenceImageUrls(model.training_photos);
    }
  };

  // Si es modo explícito y tiene perfil (modelo), mostrar el formulario explícito
  if (isExplicitMode && modelProfile?.is_explicit && modelProfile) {
    return (
      <ExplicitGenerationForm 
        onGenerateStart={onGenerateStart} 
        modelProfile={modelProfile}
      />
    );
  }

  // Si es Studio Admin en modo explícito con modelo seleccionada
  if (isExplicitMode && isStudioAdmin && selectedModel?.is_explicit && selectedModel) {
    return (
      <ExplicitGenerationForm 
        onGenerateStart={onGenerateStart} 
        modelProfile={selectedModel}
      />
    );
  }

  // NUEVO: Si es Studio Admin en modo implícito con modelo seleccionada
  if (isImplicitMode && isStudioAdmin && selectedModel) {
    return (
      <ImplicitGenerationForm 
        onGenerateStart={onGenerateStart} 
        modelProfile={selectedModel}
      />
    );
  }

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
    onGenerateStart(); 
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
          {/* Toggle Explícita - Solo visible para modelos con contenido explícito */}
          {isModelo && modelProfile?.is_explicit && (
            <div className="flex items-center justify-between rounded-xl bg-gradient-to-r from-rose-500/10 to-purple-500/10 border border-rose-500/20 p-4">
              <div className="flex items-center gap-3">
                <Flame className="h-5 w-5 text-rose-500" />
                <div>
                  <p className="font-medium text-foreground">Modo Explícito</p>
                  <p className="text-sm text-muted-foreground">
                    Genera contenido exclusivo con poses y fondos
                  </p>
                </div>
              </div>
              <Switch
                checked={isExplicitMode}
                onCheckedChange={setIsExplicitMode}
                className="data-[state=checked]:bg-rose-500"
              />
            </div>
          )}

          {/* Selector de Modelo - Solo para Studio Admin */}
          {isStudioAdmin && (
            <div className="space-y-3">
              <label className="flex items-center gap-2 text-base font-medium text-foreground">
                <Users className="h-4 w-4 text-primary" />
                Selecciona una modelo
              </label>
              {loadingModels ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <span className="ml-2 text-sm text-muted-foreground">Cargando modelos...</span>
                </div>
              ) : studioModels.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-muted p-4 text-center">
                  <p className="text-sm text-muted-foreground">
                    No tienes modelos activos con fotos de entrenamiento.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ve a &quot;Mis Modelos&quot; para crear una modelo.
                  </p>
                </div>
              ) : (
                <>
                  <Select
                    value={selectedModelId || ""}
                    onValueChange={handleModelSelect}
                  >
                    <SelectTrigger className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base h-auto">
                      <SelectValue placeholder="Selecciona una modelo para usar sus fotos..." />
                    </SelectTrigger>
                    <SelectContent>
                      {studioModels.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center gap-2">
                            {model.training_photos?.[0] && (
                              <img
                                src={model.training_photos[0]}
                                alt={model.display_name}
                                className="h-6 w-6 rounded-full object-cover"
                              />
                            )}
                            <span>{model.display_name}</span>
                            <span className="text-xs text-muted-foreground">
                              ({model.training_photos?.length || 0} fotos)
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Preview de fotos de la modelo seleccionada */}
                  {selectedModel && selectedModel.training_photos?.length > 0 && (
                    <div className="space-y-2 rounded-xl bg-secondary/30 p-4 border">
                      <p className="text-sm font-medium text-foreground">
                        Fotos de {selectedModel.display_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Se usaran como referencia para la generacion
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedModel.training_photos.slice(0, 6).map((url, index) => (
                          <div
                            key={index}
                            className="relative h-14 w-14 overflow-hidden rounded-lg border-2 border-primary/30 ring-2 ring-primary/20"
                          >
                            <img
                              src={url}
                              alt={`Foto ${index + 1}`}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ))}
                        {selectedModel.training_photos.length > 6 && (
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-muted bg-muted/50">
                            <span className="text-xs text-muted-foreground">
                              +{selectedModel.training_photos.length - 6}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {/* Se eliminó de aquí el Switch original de Modo Explícito para el Studio Admin */}
                </>
              )}
            </div>
          )}

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

          {/* 1. Prompt Principal - Solo visible para usuarios que NO son Studio Admin */}
          {!isStudioAdmin && (
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
          )}

          {/* 2. Selector de Plantillas - Solo visible para usuarios que NO son Studio Admin */}
          {!isStudioAdmin && promptTemplates.length > 0 && (
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

          {/* 3. Selector de Tamaño - Solo visible para usuarios que NO son Studio Admin */}
          {!isStudioAdmin && (
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
          )}

          {/* 4. Selector de Cantidad de Imágenes - Solo visible para usuarios que NO son Studio Admin */}
          {!isEditing && !isStudioAdmin && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-base font-medium text-foreground">
                  <Images className="h-4 w-4 text-primary" />
                  Cantidad de imágenes
                </label>
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  {numImages} {numImages === 1 ? "imagen" : "imágenes"}
                </span>
              </div>
              <Slider
                value={[numImages]}
                onValueChange={(value) => setNumImages(value[0])}
                min={1}
                max={10}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1</span>
                <span>5</span>
                <span>10</span>
              </div>
            </div>
          )}

          {/* 5. Imágenes de Referencia */}
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

          {/* ACCIONES DEL FORMULARIO */}
          {(!isEditing && isStudioAdmin) ? (
            // Vista de dos botones (Explicito / Implicito) para el Studio Admin creando imagen nueva
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <Button
                variant="outline"
                size="xl"
                className="w-full border-primary/50 text-primary hover:bg-primary/10"
                onClick={() => setIsImplicitMode(true)}
                disabled={!selectedModel || isGenerating || (!user?.isUnlimited && remainingCredits <= 0)}
              >
                <Sparkles className="mr-2 h-5 w-5" />
                Generar Implícito
              </Button>
              <Button
                variant="gradient"
                size="xl"
                className="w-full bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700"
                onClick={() => setIsExplicitMode(true)}
                // Se deshabilita si la modelo no permite contenido explicito
                disabled={!selectedModel?.is_explicit || isGenerating || (!user?.isUnlimited && remainingCredits <= 0)}
              >
                <Flame className="mr-2 h-5 w-5" />
                Generar Explícito
              </Button>
            </div>
          ) : (
            // Vista tradicional de 1 botón (para edición o para usuarios normales)
            <Button
              variant="gradient"
              size="xl"
              className="w-full"
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim() || (!user?.isUnlimited && !editIsFree && remainingCredits <= 0)}
              isLoading={isGenerating}
            >
              {!isGenerating && <Sparkles className="mr-2 h-6 w-6" />}
              {isGenerating ? "Generando..." : isEditing ? "Generar edición" : "Generar Imagen"}
            </Button>
          )}

          {!user?.isUnlimited && !editIsFree && remainingCredits <= 0 && (
            <p className="text-center text-sm text-destructive">No tienes créditos disponibles. Contacta al administrador.</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
