"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Wand2, Image as ImageIcon, User, Check, ChevronLeft, ChevronRight, Images, Upload, X, Shirt, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useGenerationStore } from "@/lib/store/generation-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { ModelProfile, CustomBackground } from "@/lib/api/types";
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

type Step = "background" | "pose" | "objects" | "clothing" | "confirm";

// Función para convertir una imagen URL a base64 (para los fondos predefinidos)
async function imageUrlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// Convertir archivo subido a base64
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      const base64Data = base64.split(',')[1];
      resolve(base64Data);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

interface ImplicitGenerationFormProps {
  onGenerateStart: () => void;
  modelProfile: ModelProfile;
}

export function ImplicitGenerationForm({ onGenerateStart, modelProfile }: ImplicitGenerationFormProps) {
  const { user } = useAuthStore();
  const {
    isGenerating, error, clearError, generateExplicit,
    customBackgrounds, isLoadingCustomBackgrounds, fetchCustomBackgrounds,
    uploadCustomBackground, deleteCustomBackground,
  } = useGenerationStore();

  const [step, setStep] = useState<Step>("background");
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);
  const [isCustomBackground, setIsCustomBackground] = useState(false);
  
  // Estado para subir nuevo fondo personalizado
  const [newBackgroundFile, setNewBackgroundFile] = useState<File | null>(null);
  const [newBackgroundName, setNewBackgroundName] = useState("");
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  
  // Paso 2: Pose
  const [posePrompt, setPosePrompt] = useState<string>("");
  
  // Paso 3: Objetos
  const [objectFiles, setObjectFiles] = useState<File[]>([]);
  const [extendedPrompt, setExtendedPrompt] = useState<string>("");

  // Paso 4: Ropa (NUEVO)
  const [clothingFiles, setClothingFiles] = useState<File[]>([]);
  const [clothingPrompt, setClothingPrompt] = useState<string>("");
  
  // Otros estados
  const [additionalPrompt, setAdditionalPrompt] = useState<string>("");
  const [numImages, setNumImages] = useState(3);

  const remainingCredits = user
    ? user.isUnlimited ? Infinity : user.dailyLimit - user.usedQuota
    : 0;

  // Cargar fondos personalizados al montar (solo para studio_admin)
  useEffect(() => {
    if (user?.isStudioAdmin) {
      fetchCustomBackgrounds();
    }
  }, [user?.isStudioAdmin, fetchCustomBackgrounds]);

  // Manejadores para fondos personalizados
  const handleBackgroundFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewBackgroundFile(file);
    }
    e.target.value = "";
  };

  const handleUploadBackground = async () => {
    if (!newBackgroundFile || !newBackgroundName.trim()) return;
    
    setIsUploadingBackground(true);
    try {
      const result = await uploadCustomBackground(newBackgroundFile, newBackgroundName.trim());
      if (result) {
        setNewBackgroundFile(null);
        setNewBackgroundName("");
      }
    } finally {
      setIsUploadingBackground(false);
    }
  };

  const handleDeleteBackground = async (bgId: string) => {
    if (selectedBackground === bgId) {
      setSelectedBackground(null);
      setIsCustomBackground(false);
    }
    await deleteCustomBackground(bgId);
  };

  const selectBackground = (id: string, isCustom: boolean) => {
    setSelectedBackground(id);
    setIsCustomBackground(isCustom);
  };

  // Manejador para subir objetos
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setObjectFiles(prev => {
        const newFiles = [...prev, ...files];
        return newFiles.slice(0, 4); // Límite de 4 imágenes
      });
    }
    e.target.value = "";
  };

  const removeFile = (indexToRemove: number) => {
    setObjectFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // Manejador para subir ropa (NUEVO)
  const handleClothingUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      setClothingFiles(prev => {
        const newFiles = [...prev, ...files];
        return newFiles.slice(0, 4); // Límite de 4 imágenes
      });
    }
    e.target.value = "";
  };

  const removeClothingFile = (indexToRemove: number) => {
    setClothingFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  // Validaciones de paso
  const canProceedToObjects = posePrompt.trim().length > 0;
  const canGenerate = selectedBackground && posePrompt.trim().length > 0;

  const handleGenerate = async () => {
    if (!canGenerate || !selectedBackground) return;
    
    clearError();
    onGenerateStart();

    try {
      let backgroundB64: string;
      let backgroundName: string;

      if (isCustomBackground) {
        // Fondo personalizado: obtener desde la URL del storage
        const customBg = customBackgrounds.find(b => b.id === selectedBackground);
        if (!customBg) {
          throw new Error("Fondo personalizado no encontrado");
        }
        backgroundB64 = await imageUrlToBase64(customBg.storage_url);
        backgroundName = customBg.name;
      } else {
        // Fondo predefinido
        const background = BACKGROUNDS.find(b => b.id === selectedBackground);
        if (!background) {
          throw new Error("Fondo no encontrado");
        }
        backgroundB64 = await imageUrlToBase64(background.image);
        backgroundName = background.name;
      }

      const trainingPhotos = modelProfile.training_photos || [];
      
      console.log("[v0] Implicit Generation - Starting...");

      // 2. Convertir archivos de objetos subidos a base64
      const objectsB64 = await Promise.all(objectFiles.map(file => fileToBase64(file)));

      // 3. Convertir archivos de ropa a base64 (NUEVO)
      const clothingB64 = await Promise.all(clothingFiles.map(file => fileToBase64(file)));

      // 4. Usar las URLs de las fotos de entrenamiento directamente
      const modelPhotoUrls = trainingPhotos.slice(0, 4); 

      // Combinar URLs de la modelo + objetos en base64 + ropa en base64
      const allReferences = [...modelPhotoUrls, ...objectsB64, ...clothingB64];

      // Construir prompt combinado incluyendo la ropa
      let fullPrompt = `${backgroundName} setting. Pose: ${posePrompt.trim()}`;
      
      if (clothingFiles.length > 0 || clothingPrompt.trim()) {
        fullPrompt += `. Wearing specific clothing/outfit: ${clothingPrompt.trim() || "as shown in the reference images"}`;
      }
      if (extendedPrompt.trim()) {
        fullPrompt += `. Objects/Details: ${extendedPrompt.trim()}`;
      }
      if (additionalPrompt.trim()) {
        fullPrompt += `. ${additionalPrompt.trim()}`;
      }

      const requestData = {
        background_b64: backgroundB64,
        pose_b64: "", 
        reference_url: modelPhotoUrls[0] || "", 
        reference_urls: allReferences, 
        additional_prompt: fullPrompt,
        width: 1024,
        height: 1024,
        num_images: numImages,
      };

      console.log("[v0] Sending to API - Request prepared.");
      await generateExplicit(requestData);
    } catch (err: any) {
      console.error("[v0] Implicit generation error:", err);
    }
  };

  const goToStep = (newStep: Step) => {
    setStep(newStep);
  };

  const getStepNumber = (s: Step) => {
    switch (s) {
      case "background": return 1;
      case "pose": return 2;
      case "objects": return 3;
      case "clothing": return 4;
      case "confirm": return 5;
    }
  };

  const currentStepNum = getStepNumber(step);
  const stepLabels = ["Fondo", "Pose", "Objetos", "Ropa", "Generar"];

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
                Contenido Implícito
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
            {stepLabels.map((label, idx) => (
              <div key={label} className="flex items-center flex-1 last:flex-none">
                <div className={cn(
                  "flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-all shrink-0",
                  idx + 1 <= currentStepNum 
                    ? "bg-rose-500 text-white" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {idx + 1 < currentStepNum ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span className={cn(
                  "ml-2 text-xs hidden sm:inline whitespace-nowrap",
                  idx + 1 <= currentStepNum ? "text-rose-300" : "text-muted-foreground"
                )}>
                  {label}
                </span>
                {idx < stepLabels.length - 1 && (
                  <div className={cn(
                    "w-full h-0.5 mx-2 min-w-[10px]",
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

                {/* Fondos Predefinidos */}
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Fondos predefinidos</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => selectBackground(bg.id, false)}
                        className={cn(
                          "relative aspect-video rounded-xl overflow-hidden border-2 transition-all",
                          selectedBackground === bg.id && !isCustomBackground
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
                        {selectedBackground === bg.id && !isCustomBackground && (
                          <div className="absolute top-1 right-1 bg-rose-500 rounded-full p-1">
                            <Check className="h-3 w-3 text-white" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fondos Personalizados (solo para studio_admin) */}
                {user?.isStudioAdmin && (
                  <div className="border-t border-rose-500/20 pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Mis fondos personalizados</p>

                    {/* Grid de fondos personalizados con opcion de subida integrada */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {/* Tarjeta de subida siempre visible */}
                      <div className="relative aspect-video">
                        {newBackgroundFile ? (
                          <div className="relative h-full w-full rounded-xl overflow-hidden border-2 border-dashed border-rose-500/50 bg-rose-500/10">
                            <img
                              src={URL.createObjectURL(newBackgroundFile)}
                              alt="Preview"
                              className="h-full w-full object-cover"
                            />
                            <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-2 gap-1">
                              <Input
                                value={newBackgroundName}
                                onChange={(e) => setNewBackgroundName(e.target.value)}
                                placeholder="Nombre..."
                                className="h-7 text-xs bg-background/80 border-rose-500/30 text-center"
                              />
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  onClick={handleUploadBackground}
                                  disabled={!newBackgroundName.trim() || isUploadingBackground}
                                  className="h-6 px-2 text-xs bg-rose-500 hover:bg-rose-600"
                                >
                                  {isUploadingBackground ? <Loader2 className="h-3 w-3 animate-spin" /> : "Guardar"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => { setNewBackgroundFile(null); setNewBackgroundName(""); }}
                                  className="h-6 px-2 text-xs"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <label className="flex h-full w-full cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/5 transition-colors">
                            <Upload className="h-6 w-6 text-rose-400 mb-1" />
                            <span className="text-xs text-rose-400 font-medium">Subir fondo</span>
                            <input
                              ref={uploadInputRef}
                              type="file"
                              accept="image/png,image/jpeg,image/webp"
                              onChange={handleBackgroundFileSelect}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>

                      {/* Fondos personalizados existentes */}
                      {isLoadingCustomBackgrounds ? (
                        <div className="flex items-center justify-center aspect-video">
                          <Loader2 className="h-5 w-5 animate-spin text-rose-400" />
                        </div>
                      ) : (
                        customBackgrounds.map((bg) => (
                          <div key={bg.id} className="relative group">
                            <button
                              onClick={() => selectBackground(bg.id, true)}
                              className={cn(
                                "relative aspect-video rounded-xl overflow-hidden border-2 transition-all w-full",
                                selectedBackground === bg.id && isCustomBackground
                                  ? "border-rose-500 ring-2 ring-rose-500/50 scale-105"
                                  : "border-transparent hover:border-rose-500/50"
                              )}
                            >
                              <img
                                src={bg.storage_url}
                                alt={bg.name}
                                className="w-full h-full object-cover"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                              <span className="absolute bottom-1 left-1 right-1 text-xs text-white font-medium text-center">
                                {bg.name}
                              </span>
                              {selectedBackground === bg.id && isCustomBackground && (
                                <div className="absolute top-1 right-1 bg-rose-500 rounded-full p-1">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </button>
                            {/* Boton eliminar */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteBackground(bg.id);
                              }}
                              className="absolute top-1 left-1 bg-destructive/80 hover:bg-destructive rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="h-3 w-3 text-white" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}

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

            {/* Step 2: Describir Pose */}
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
                  Describe la pose
                </h3>
                <div className="space-y-2">
                  <Textarea
                    value={posePrompt}
                    onChange={(e) => setPosePrompt(e.target.value)}
                    placeholder="Describe la pose deseada (ej. sentada casualmente, de pie mirando por la ventana...)"
                    className="min-h-[120px] bg-background/50 border-rose-500/20 focus:border-rose-500/50 resize-none text-base"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {posePrompt.length}/500 caracteres
                  </p>
                </div>
                
                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => goToStep("background")}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                  </Button>
                  <Button
                    onClick={() => goToStep("objects")}
                    disabled={!canProceedToObjects}
                    className="bg-rose-500 hover:bg-rose-600"
                  >
                    Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Objetos y Prompt Extendido */}
            {step === "objects" && (
              <motion.div
                key="objects"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                    <ImageIcon className="h-5 w-5 text-rose-400" />
                    Objetos (Opcional)
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sube hasta 4 imágenes de objetos que quieras incluir en la escena.
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    {objectFiles.map((file, index) => (
                      <div key={index} className="relative h-20 w-20 overflow-hidden rounded-lg border border-rose-500/30">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={`Objeto ${index + 1}`} 
                          className="h-full w-full object-cover" 
                        />
                        <button
                          onClick={() => removeFile(index)}
                          className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground z-10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    
                    {objectFiles.length < 4 && (
                      <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-rose-500/30 transition-colors hover:border-rose-500 bg-rose-500/5">
                        <Upload className="h-5 w-5 text-rose-400 mb-1" />
                        <span className="text-[10px] text-rose-400">Subir</span>
                        <input 
                          type="file" 
                          accept="image/png,image/jpeg,image/webp" 
                          multiple 
                          onChange={handleFileUpload} 
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Prompt Extendido de Objetos
                  </label>
                  <Textarea
                    value={extendedPrompt}
                    onChange={(e) => setExtendedPrompt(e.target.value)}
                    placeholder="Describe detalles sobre los objetos y el entorno (ej. un jarrón de cristal sobre una mesa de madera...)"
                    className="min-h-[100px] bg-background/50 border-rose-500/20 focus:border-rose-500/50 resize-none text-sm"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {extendedPrompt.length}/500 caracteres
                  </p>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => goToStep("pose")}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                  </Button>
                  <Button
                    onClick={() => goToStep("clothing")}
                    className="bg-rose-500 hover:bg-rose-600"
                  >
                    Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Ropa (NUEVO PASO) */}
            {step === "clothing" && (
              <motion.div
                key="clothing"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
                    <Shirt className="h-5 w-5 text-rose-400" />
                    Ropa (Opcional)
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Sube imágenes de la ropa que deseas que vista la modelo (hasta 4 prendas).
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    {clothingFiles.map((file, index) => (
                      <div key={index} className="relative h-20 w-20 overflow-hidden rounded-lg border border-rose-500/30">
                        <img 
                          src={URL.createObjectURL(file)} 
                          alt={`Prenda ${index + 1}`} 
                          className="h-full w-full object-cover" 
                        />
                        <button
                          onClick={() => removeClothingFile(index)}
                          className="absolute -right-1 -top-1 rounded-full bg-destructive p-1 text-destructive-foreground z-10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    
                    {clothingFiles.length < 4 && (
                      <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-rose-500/30 transition-colors hover:border-rose-500 bg-rose-500/5">
                        <Upload className="h-5 w-5 text-rose-400 mb-1" />
                        <span className="text-[10px] text-rose-400">Subir</span>
                        <input 
                          type="file" 
                          accept="image/png,image/jpeg,image/webp" 
                          multiple 
                          onChange={handleClothingUpload} 
                          className="hidden" 
                        />
                      </label>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">
                    Descripción del atuendo
                  </label>
                  <Textarea
                    value={clothingPrompt}
                    onChange={(e) => setClothingPrompt(e.target.value)}
                    placeholder="Describe cómo se llevan las prendas (ej. chaqueta abierta sobre camiseta blanca, pantalones ajustados...)"
                    className="min-h-[100px] bg-background/50 border-rose-500/20 focus:border-rose-500/50 resize-none text-sm"
                    maxLength={500}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {clothingPrompt.length}/500 caracteres
                  </p>
                </div>

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => goToStep("objects")}>
                    <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                  </Button>
                  <Button
                    onClick={() => goToStep("confirm")}
                    className="bg-rose-500 hover:bg-rose-600"
                  >
                    Siguiente <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 5: Confirmar y Generar */}
            {step === "confirm" && (
              <motion.div
                key="confirm"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-rose-400" />
                  Confirma tu selección
                </h3>
                
                {/* Fondo y Pose */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Fondo</p>
                    <div className="aspect-video rounded-lg overflow-hidden border border-rose-500/30 relative">
                      <img
                        src={
                          isCustomBackground
                            ? customBackgrounds.find(b => b.id === selectedBackground)?.storage_url
                            : BACKGROUNDS.find(b => b.id === selectedBackground)?.image
                        }
                        alt="Fondo seleccionado"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-black/60 p-2">
                         <p className="text-xs text-white text-center">
                          {isCustomBackground
                            ? customBackgrounds.find(b => b.id === selectedBackground)?.name
                            : BACKGROUNDS.find(b => b.id === selectedBackground)?.name}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">Pose solicitada</p>
                    <div className="h-full rounded-lg border border-rose-500/30 bg-rose-500/5 p-3 flex items-start">
                      <p className="text-sm text-foreground line-clamp-4">
                        &quot;{posePrompt}&quot;
                      </p>
                    </div>
                  </div>
                </div>

                {/* Objetos y Ropa Subida */}
                <div className="space-y-3 border-t border-rose-500/20 pt-4">
                  {(objectFiles.length > 0 || clothingFiles.length > 0) && (
                    <p className="text-sm font-medium text-foreground">Referencias Adicionales (Objetos/Ropa)</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2">
                    {objectFiles.map((file, idx) => (
                      <div key={`obj-${idx}`} className="h-12 w-12 rounded border border-rose-500/30 overflow-hidden">
                        <img src={URL.createObjectURL(file)} className="h-full w-full object-cover" alt="Objeto" />
                      </div>
                    ))}
                    {clothingFiles.map((file, idx) => (
                      <div key={`cloth-${idx}`} className="h-12 w-12 rounded border border-purple-500/30 overflow-hidden">
                        <img src={URL.createObjectURL(file)} className="h-full w-full object-cover" alt="Prenda" />
                      </div>
                    ))}
                  </div>
                  
                  {extendedPrompt && (
                    <p className="text-xs text-muted-foreground italic">
                      <span className="font-semibold not-italic">Objetos:</span> {extendedPrompt}
                    </p>
                  )}
                  {clothingPrompt && (
                    <p className="text-xs text-muted-foreground italic">
                      <span className="font-semibold not-italic">Atuendo:</span> {clothingPrompt}
                    </p>
                  )}
                </div>

                {/* Selector de Cantidad de Imágenes */}
                <div className="space-y-3 rounded-lg border border-rose-500/20 bg-rose-500/5 p-4 mt-4">
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

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="rounded-lg bg-destructive/10 p-4 text-center text-destructive"
                  >
                    {error}
                  </motion.div>
                )}

                <div className="flex justify-between pt-2">
                  <Button variant="outline" onClick={() => goToStep("clothing")} disabled={isGenerating}>
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
