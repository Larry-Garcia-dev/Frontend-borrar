"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2, Image as ImageIcon, User, Check, ChevronLeft, ChevronRight, RefreshCw, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { useGenerationStore } from "@/lib/store/generation-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { ModelProfile } from "@/lib/api/types";
import { cn } from "@/lib/utils";

// Fondos disponibles
const BACKGROUNDS = [
  { id: "pool", name: "Piscina", image: "/backgrounds/pool.jpg" },
  { id: "kitchen", name: "Cocina Moderna", image: "/backgrounds/kitchen.jpg" },
  { id: "living-room", name: "Sala Moderna", image: "/backgrounds/living-room.jpg" },
  { id: "bar", name: "Bar/Lounge", image: "/backgrounds/bar.jpg" },
  { id: "bedroom", name: "Dormitorio", image: "/backgrounds/bedroom.jpg" },
  { id: "terrace", name: "Terraza", image: "/backgrounds/terrace.jpg" },
  { id: "bathroom", name: "Baño Spa", image: "/backgrounds/bathroom.jpg" },
  { id: "studio", name: "Estudio Foto", image: "/backgrounds/studio.jpg" },
];

// Poses disponibles (usando las mismas del entrenamiento explícito)
const POSES = [
  { id: "pose-1", name: "De pie", image: "/poses/explicit/pose-1.jpg" },
  { id: "pose-2", name: "Arrodillada", image: "/poses/explicit/pose-2.jpg" },
  { id: "pose-3", name: "Acostada", image: "/poses/explicit/pose-3.jpg" },
  { id: "pose-4", name: "En cuatro", image: "/poses/explicit/pose-4.jpg" },
  { id: "pose-5", name: "Inclinada", image: "/poses/explicit/pose-5.jpg" },
  { id: "pose-6", name: "Sentada", image: "/poses/explicit/pose-6.jpg" },
  { id: "pose-7", name: "Boca abajo", image: "/poses/explicit/pose-7.jpg" },
  { id: "pose-8", name: "Arqueada", image: "/poses/explicit/pose-8.jpg" },
];

type Step = "background" | "pose" | "photo" | "confirm";

// Función para convertir una imagen URL a base64
async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      // Remover el prefijo "data:image/...;base64," para obtener solo el base64
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface ExplicitGenerationFormProps {
  onGenerateStart: () => void;
  modelProfile: ModelProfile;
}

export function ExplicitGenerationForm({ onGenerateStart, modelProfile }: ExplicitGenerationFormProps) {
  const { user } = useAuthStore();
  const {
    isGenerating, error, clearError, generateExplicit,
  } = useGenerationStore();

  const [step, setStep] = useState<Step>("background");
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [selectedPose, setSelectedPose] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [additionalPrompt, setAdditionalPrompt] = useState<string>("");
  const [randomSeed, setRandomSeed] = useState(0);
  const [numImages, setNumImages] = useState(3);

  const trainingPhotos = modelProfile.explicit_training_photos || [];

  // Función para obtener 4 fotos aleatorias
  const getRandomPhotos = useCallback((photos: string[], count: number = 4): string[] => {
    if (photos.length <= count) return photos;
    const shuffled = [...photos].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }, []);

  // Generar fotos aleatorias cuando cambie el seed o se llegue al paso 3
  const randomPhotos = useMemo(() => {
    return getRandomPhotos(trainingPhotos, 4);
  }, [trainingPhotos, randomSeed, getRandomPhotos]);

  // Seleccionar automáticamente todas las fotos random cuando se llega al paso 3
  useEffect(() => {
    if (step === "photo" && randomPhotos.length > 0) {
      setSelectedPhotos(randomPhotos);
    }
  }, [step, randomPhotos]);

  // Función para refrescar las fotos aleatorias
  const handleRefreshPhotos = () => {
    setRandomSeed(prev => prev + 1);
  };
  
  const remainingCredits = user
    ? user.isUnlimited ? Infinity : user.dailyLimit - user.usedQuota
    : 0;

  const canGenerate = selectedBackground && selectedPose && selectedPhotos.length > 0;

  const handleGenerate = async () => {
    if (!canGenerate || !selectedBackground || !selectedPose || selectedPhotos.length === 0) return;
    
    clearError();
    onGenerateStart();

    try {
      // Obtener los datos de las imágenes
      const background = BACKGROUNDS.find(b => b.id === selectedBackground);
      const pose = POSES.find(p => p.id === selectedPose);
      
      if (!background || !pose) {
        throw new Error("Fondo o pose no encontrados");
      }

      console.log("[v0] Explicit Generation - Starting conversion...");
      console.log("[v0] Background:", background.name, background.image);
      console.log("[v0] Pose:", pose.name, pose.image);
      console.log("[v0] Selected photos (reference URLs):", selectedPhotos);

      // Convertir imágenes locales a base64
      const [backgroundB64, poseB64] = await Promise.all([
        imageUrlToBase64(background.image),
        imageUrlToBase64(pose.image),
      ]);

      console.log("[v0] Background B64 length:", backgroundB64.length);
      console.log("[v0] Pose B64 length:", poseB64.length);

      // Construir prompt combinado
      const fullPrompt = additionalPrompt.trim()
        ? `${background.name} setting, ${pose.name} pose. ${additionalPrompt}`
        : `${background.name} setting, ${pose.name} pose`;

      const requestData = {
        background_b64: backgroundB64,
        pose_b64: poseB64,
        reference_url: selectedPhotos[0],
        reference_urls: selectedPhotos, // Enviamos todas las fotos aleatorias
        additional_prompt: fullPrompt,
        width: 1024,
        height: 1024,
        num_images: numImages,
      };

      console.log("[v0] Sending to API - request data:", {
        background_b64_length: requestData.background_b64.length,
        pose_b64_length: requestData.pose_b64.length,
        reference_url: requestData.reference_url,
        reference_urls: requestData.reference_urls,
        additional_prompt: requestData.additional_prompt,
        num_images: requestData.num_images,
      });

      // Usar el store para la generación con múltiples fotos de referencia
      await generateExplicit(requestData);
    } catch (err: any) {
      console.error("[v0] Explicit generation error:", err);
    }
  };

  const goToStep = (newStep: Step) => {
    setStep(newStep);
  };

  const getStepNumber = (s: Step) => {
    switch (s) {
      case "background": return 1;
      case "pose": return 2;
      case "photo": return 3;
      case "confirm": return 4;
    }
  };

  const currentStepNum = getStepNumber(step);

  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }} 
      animate={{ opacity: 1, x: 0 }} 
      transition={{ delay: 0.1 }} 
      className="w-full lg:w-1/2"
    >
      <Card className="h-full bg-gradient-to-br from-rose-950/20 to-purple-950/20 border-rose-500/20">
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="flex items-center gap-2 sm:gap-3 text-lg sm:text-2xl">
              <Wand2 className="h-5 w-5 sm:h-6 sm:w-6 text-rose-400" />
              <span className="bg-gradient-to-r from-rose-400 to-purple-400 bg-clip-text text-transparent">
                Contenido Exclusivo
              </span>
            </CardTitle>
            <div className="flex items-center gap-2 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-1.5 sm:px-4 sm:py-2">
              <Sparkles className="h-4 w-4 text-rose-400" />
              <span className="text-xs sm:text-sm font-medium text-rose-300">
                {user?.isUnlimited ? "Ilimitado" : remainingCredits} créditos
              </span>
            </div>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-between mt-4">
            {["Fondo", "Pose", "Foto", "Generar"].map((label, idx) => (
              <div key={label} className="flex items-center">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all",
                  idx + 1 <= currentStepNum 
                    ? "bg-rose-500 text-white" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {idx + 1 < currentStepNum ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={cn(
                  "ml-2 text-xs hidden sm:inline",
                  idx + 1 <= currentStepNum ? "text-rose-300" : "text-muted-foreground"
                )}>
                  {label}
                </span>
                {idx < 3 && (
                  <div className={cn(
                    "w-8 sm:w-12 h-0.5 mx-2",
                    idx + 1 < currentStepNum ? "bg-rose-500" : "bg-muted"
                  )} />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Seleccionar Fondo */}
            {step === "background" && (
              <motion.div
                key="background"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-rose-400" />
                  Selecciona el fondo
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {BACKGROUNDS.map((bg) => (
                    <button
                      key={bg.id}
                      onClick={() => setSelectedBackground(bg.id)}
                      className={cn(
                        "relative aspect-video rounded-xl overflow-hidden border-2 transition-all",
                        selectedBackground === bg.id
                          ? "border-rose-500 ring-2 ring-rose-500/50 scale-105"
                          : "border-transparent hover:border-rose-500/50"
                      )}
                    >
                      <img
                        src={bg.image}
                        alt={bg.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <span className="absolute bottom-1 left-1 right-1 text-xs text-white font-medium text-center">
                        {bg.name}
                      </span>
                      {selectedBackground === bg.id && (
                        <div className="absolute top-1 right-1 bg-rose-500 rounded-full p-1">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => goToStep("pose")}
                    disabled={!selectedBackground}
                    className="bg-rose-500 hover:bg-rose-600"
                  >
                    Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Seleccionar Pose */}
            {step === "pose" && (
              <motion.div
                key="pose"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <User className="h-5 w-5 text-rose-400" />
                  Selecciona la pose
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {POSES.map((pose) => (
                    <button
                      key={pose.id}
                      onClick={() => setSelectedPose(pose.id)}
                      className={cn(
                        "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                        selectedPose === pose.id
                          ? "border-rose-500 ring-2 ring-rose-500/50 scale-105"
                          : "border-transparent hover:border-rose-500/50"
                      )}
                    >
                      <img
                        src={pose.image}
                        alt={pose.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      <span className="absolute bottom-1 left-1 right-1 text-xs text-white font-medium text-center">
                        {pose.name}
                      </span>
                      {selectedPose === pose.id && (
                        <div className="absolute top-1 right-1 bg-rose-500 rounded-full p-1">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => goToStep("background")}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                  </Button>
                  <Button
                    onClick={() => goToStep("photo")}
                    disabled={!selectedPose}
                    className="bg-rose-500 hover:bg-rose-600"
                  >
                    Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Fotos de Referencia (4 aleatorias) */}
            {step === "photo" && (
              <motion.div
                key="photo"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <ImageIcon className="h-5 w-5 text-rose-400" />
                    Fotos de referencia
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshPhotos}
                    className="text-xs border-rose-500/30 hover:bg-rose-500/10"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Cambiar fotos
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Hemos seleccionado 4 fotos al azar de tu entrenamiento
                </p>
                {randomPhotos.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tienes fotos de entrenamiento explícitas disponibles
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {randomPhotos.map((photo, idx) => (
                      <div
                        key={`${photo}-${idx}`}
                        className="relative aspect-square rounded-xl overflow-hidden border-2 border-rose-500/50 ring-2 ring-rose-500/30"
                      >
                        <img
                          src={photo}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-2 left-2 bg-rose-500 rounded-full px-2 py-0.5">
                          <span className="text-xs text-white font-medium">{idx + 1}</span>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <div className="flex items-center justify-center">
                            <Check className="h-4 w-4 text-rose-400 mr-1" />
                            <span className="text-xs text-white">Seleccionada</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-between">
                  <Button
                    variant="outline"
                    onClick={() => goToStep("pose")}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                  </Button>
                  <Button
                    onClick={() => goToStep("confirm")}
                    disabled={randomPhotos.length === 0}
                    className="bg-rose-500 hover:bg-rose-600"
                  >
                    Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Confirmar y Generar */}
            {step === "confirm" && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-rose-400" />
                  Confirma tu selección
                </h3>
                
                {/* Fondo y Pose */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Fondo */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center">Fondo</p>
                    <div className="aspect-video rounded-lg overflow-hidden border border-rose-500/30">
                      <img
                        src={BACKGROUNDS.find(b => b.id === selectedBackground)?.image}
                        alt="Fondo seleccionado"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-center text-rose-300">
                      {BACKGROUNDS.find(b => b.id === selectedBackground)?.name}
                    </p>
                  </div>
                  
                  {/* Pose */}
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground text-center">Pose</p>
                    <div className="aspect-video rounded-lg overflow-hidden border border-rose-500/30">
                      <img
                        src={POSES.find(p => p.id === selectedPose)?.image}
                        alt="Pose seleccionada"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-center text-rose-300">
                      {POSES.find(p => p.id === selectedPose)?.name}
                    </p>
                  </div>
                </div>

                {/* Fotos de referencia (4 aleatorias) */}
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground text-center">Fotos de referencia ({selectedPhotos.length})</p>
                  <div className="grid grid-cols-4 gap-2">
                    {selectedPhotos.map((photo, idx) => (
                      <div 
                        key={`confirm-${idx}`}
                        className="relative aspect-square rounded-lg overflow-hidden border border-rose-500/30"
                      >
                        <img
                          src={photo}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute top-1 left-1 bg-rose-500/80 rounded-full w-4 h-4 flex items-center justify-center">
                          <span className="text-[10px] text-white font-bold">{idx + 1}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Selector de Cantidad de Imágenes */}
                <div className="space-y-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-4">
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <Images className="h-4 w-4 text-rose-400" />
                      Cantidad de imágenes
                    </label>
                    <span className="rounded-full bg-rose-500/20 px-3 py-1 text-sm font-semibold text-rose-300">
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

                {/* Input de Prompt Adicional */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Instrucciones adicionales (opcional)
                  </label>
                  <Textarea
                    value={additionalPrompt}
                    onChange={(e) => setAdditionalPrompt(e.target.value)}
                    placeholder="Describe detalles adicionales: iluminación, ambiente, accesorios, etc."
                    className="min-h-[80px] bg-background/50 border-rose-500/20 focus:border-rose-500/50 resize-none"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {additionalPrompt.length}/500 caracteres
                  </p>
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="rounded-lg bg-destructive/10 p-4 text-center text-destructive"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="flex justify-between pt-4">
                  <Button
                    variant="outline"
                    onClick={() => goToStep("photo")}
                    disabled={isGenerating}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                  </Button>
                  <Button
                    onClick={handleGenerate}
                    disabled={isGenerating || !canGenerate || (!user?.isUnlimited && remainingCredits <= 0)}
                    className="bg-gradient-to-r from-rose-500 to-purple-500 hover:from-rose-600 hover:to-purple-600"
                  >
                    {isGenerating ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Generando...
                      </span>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Generar Imagen
                      </>
                    )}
                  </Button>
                </div>

                {!user?.isUnlimited && remainingCredits <= 0 && (
                  <p className="text-center text-sm text-destructive">
                    No tienes créditos disponibles. Contacta al administrador.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>
      </Card>
    </motion.div>
  );
}
