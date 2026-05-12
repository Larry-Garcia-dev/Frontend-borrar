"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Upload, X, Camera, CheckCircle2, AlertCircle, ImageIcon, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import Image from "next/image";

// Poses de referencia para fotos implícitas
const IMPLICIT_POSES = [
  { id: "seated", name: "Sentada", image: "/poses/pose-seated.jpg", description: "Pose sentada natural y relajada" },
  { id: "standing", name: "Parada", image: "/poses/pose-standing.jpg", description: "De pie, cuerpo completo" },
  { id: "lying", name: "Acostada", image: "/poses/pose-lying.jpg", description: "Recostada de lado" },
  { id: "side", name: "De Lado", image: "/poses/pose-side.jpg", description: "Vista de perfil lateral" },
  { id: "face", name: "Rostro", image: "/poses/pose-face.jpg", description: "Primer plano del rostro" },
];

// Poses de referencia para fotos explícitas (8 poses requeridas)
const EXPLICIT_POSES = [
  { id: "exp-1", name: "Pose 1", image: "/poses/explicit/pose-1.jpg", description: "Parada con manos en cadera" },
  { id: "exp-2", name: "Pose 2", image: "/poses/explicit/pose-2.jpg", description: "De rodillas" },
  { id: "exp-3", name: "Pose 3", image: "/poses/explicit/pose-3.jpg", description: "Acostada boca arriba" },
  { id: "exp-4", name: "Pose 4", image: "/poses/explicit/pose-4.jpg", description: "En cuatro puntos" },
  { id: "exp-5", name: "Pose 5", image: "/poses/explicit/pose-5.jpg", description: "Inclinada hacia adelante" },
  { id: "exp-6", name: "Pose 6", image: "/poses/explicit/pose-6.jpg", description: "Sentada abierta" },
  { id: "exp-7", name: "Pose 7", image: "/poses/explicit/pose-7.jpg", description: "Acostada boca abajo" },
  { id: "exp-8", name: "Pose 8", image: "/poses/explicit/pose-8.jpg", description: "Espalda arqueada" },
];

interface PhotoStepProps {
  photos: { file: File; preview: string; url?: string }[];
  setPhotos: React.Dispatch<React.SetStateAction<{ file: File; preview: string; url?: string }[]>>;
  explicitPhotos: { file: File; preview: string; url?: string; poseId: string }[];
  setExplicitPhotos: React.Dispatch<React.SetStateAction<{ file: File; preview: string; url?: string; poseId: string }[]>>;
  isExplicit: boolean;
  setIsExplicit: React.Dispatch<React.SetStateAction<boolean>>;
  onNext: () => void;
}

export function PhotoStep({ 
  photos, 
  setPhotos, 
  explicitPhotos, 
  setExplicitPhotos, 
  isExplicit, 
  setIsExplicit, 
  onNext 
}: PhotoStepProps) {
  const [currentExplicitPose, setCurrentExplicitPose] = useState(0);

  // Dropzone para fotos implícitas
  const onDropImplicit = useCallback((acceptedFiles: File[]) => {
    const newPhotos = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 20));
  }, [setPhotos]);

  const { getRootProps: getRootPropsImplicit, getInputProps: getInputPropsImplicit, isDragActive: isDragActiveImplicit } = useDropzone({
    onDrop: onDropImplicit,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxSize: 10 * 1024 * 1024,
  });

  // Dropzone para fotos explícitas (una por pose)
  const onDropExplicit = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      const poseId = EXPLICIT_POSES[currentExplicitPose].id;
      
      // Verificar si ya existe una foto para esta pose
      const existingIndex = explicitPhotos.findIndex(p => p.poseId === poseId);
      
      if (existingIndex >= 0) {
        // Reemplazar foto existente
        setExplicitPhotos(prev => {
          const newPhotos = [...prev];
          URL.revokeObjectURL(newPhotos[existingIndex].preview);
          newPhotos[existingIndex] = {
            file,
            preview: URL.createObjectURL(file),
            poseId,
          };
          return newPhotos;
        });
      } else {
        // Agregar nueva foto
        setExplicitPhotos(prev => [...prev, {
          file,
          preview: URL.createObjectURL(file),
          poseId,
        }]);
      }
      
      // Avanzar a la siguiente pose automáticamente si no es la última
      if (currentExplicitPose < EXPLICIT_POSES.length - 1) {
        setTimeout(() => setCurrentExplicitPose(prev => prev + 1), 500);
      }
    }
  }, [currentExplicitPose, explicitPhotos, setExplicitPhotos]);

  const { getRootProps: getRootPropsExplicit, getInputProps: getInputPropsExplicit, isDragActive: isDragActiveExplicit } = useDropzone({
    onDrop: onDropExplicit,
    accept: { "image/*": [".jpeg", ".jpg", ".png", ".webp"] },
    maxSize: 10 * 1024 * 1024,
    maxFiles: 1,
  });

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const removeExplicitPhoto = (poseId: string) => {
    setExplicitPhotos(prev => {
      const photo = prev.find(p => p.poseId === poseId);
      if (photo) URL.revokeObjectURL(photo.preview);
      return prev.filter(p => p.poseId !== poseId);
    });
  };

  const getExplicitPhotoForPose = (poseId: string) => {
    return explicitPhotos.find(p => p.poseId === poseId);
  };

  const canProceedImplicit = photos.length >= 5;
  const canProceedExplicit = explicitPhotos.length === 8;
  const canProceed = isExplicit ? (canProceedImplicit && canProceedExplicit) : canProceedImplicit;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Card principal de fotos implícitas */}
      <Card>
        <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
          <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Camera className="h-5 w-5" />
            Fotos de Entrenamiento
          </CardTitle>
          <CardDescription className="text-xs sm:text-sm">
            Sube al menos 5 fotos de alta calidad. Incluye diferentes ángulos, expresiones y fondos.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-6">
          {/* Poses de referencia para fotos implícitas */}
          <div className="space-y-3">
            <Label className="text-sm font-medium text-muted-foreground">Poses de referencia sugeridas:</Label>
            <div className="grid grid-cols-5 gap-2">
              {IMPLICIT_POSES.map((pose) => (
                <div key={pose.id} className="flex flex-col items-center gap-1">
                  <div className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted">
                    <Image
                      src={pose.image}
                      alt={pose.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <span className="text-[10px] sm:text-xs text-center text-muted-foreground font-medium">
                    {pose.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Área de carga */}
          <div
            {...getRootPropsImplicit()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all",
              isDragActiveImplicit
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-secondary/50"
            )}
          >
            <input {...getInputPropsImplicit()} />
            <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
            <p className="mt-2 text-sm sm:text-base text-muted-foreground font-medium">
              {isDragActiveImplicit
                ? "Suelta las fotos aquí..."
                : "Arrastra fotos o toca para seleccionar"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPG o WebP hasta 10MB
            </p>
          </div>

          {/* Grid de fotos cargadas */}
          {photos.length > 0 && (
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
              {photos.map((photo, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="group relative aspect-square"
                >
                  <img
                    src={photo.preview}
                    alt={`Foto ${index + 1}`}
                    className="h-full w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -right-1 -top-1 sm:-right-2 sm:-top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}

          {/* Contador de fotos */}
          <div className={cn(
            "flex items-center justify-center gap-2 rounded-lg py-2 px-4 text-sm font-medium",
            canProceedImplicit
              ? "bg-green-500/10 text-green-600"
              : "bg-amber-500/10 text-amber-600"
          )}>
            {canProceedImplicit ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                {photos.length} fotos cargadas
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                {photos.length} de 5 fotos mínimas (faltan {5 - photos.length})
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Switch para contenido explícito */}
      <Card className={cn(
        "transition-all border-2",
        isExplicit ? "border-rose-500/50 bg-rose-500/5" : "border-transparent"
      )}>
        <CardContent className="px-4 py-4 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Flame className={cn("h-5 w-5", isExplicit ? "text-rose-500" : "text-muted-foreground")} />
              <div>
                <Label htmlFor="explicit-mode" className="text-base font-medium cursor-pointer">
                  Contenido Explícito
                </Label>
                <p className="text-xs text-muted-foreground">
                  Habilitar para subir fotos de contenido adulto
                </p>
              </div>
            </div>
            <Switch
              id="explicit-mode"
              checked={isExplicit}
              onCheckedChange={setIsExplicit}
              className="data-[state=checked]:bg-rose-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* Sección de fotos explícitas */}
      <AnimatePresence>
        {isExplicit && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Card className="border-rose-500/30">
              <CardHeader className="px-4 py-4 sm:px-6 sm:py-6 bg-rose-500/5">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl text-rose-600">
                  <Flame className="h-5 w-5" />
                  Fotos Explícitas (8 requeridas)
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Sube una foto para cada pose mostrada. Se requieren las 8 poses.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-6">
                {/* Navegación de poses */}
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentExplicitPose(prev => Math.max(0, prev - 1))}
                    disabled={currentExplicitPose === 0}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Anterior
                  </Button>
                  <span className="text-sm font-medium">
                    Pose {currentExplicitPose + 1} de {EXPLICIT_POSES.length}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentExplicitPose(prev => Math.min(EXPLICIT_POSES.length - 1, prev + 1))}
                    disabled={currentExplicitPose === EXPLICIT_POSES.length - 1}
                  >
                    Siguiente
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                {/* Indicadores de progreso */}
                <div className="flex gap-1 justify-center">
                  {EXPLICIT_POSES.map((pose, index) => {
                    const hasPhoto = !!getExplicitPhotoForPose(pose.id);
                    return (
                      <button
                        key={pose.id}
                        type="button"
                        onClick={() => setCurrentExplicitPose(index)}
                        className={cn(
                          "w-8 h-2 rounded-full transition-all",
                          index === currentExplicitPose
                            ? "bg-rose-500"
                            : hasPhoto
                            ? "bg-green-500"
                            : "bg-muted-foreground/30"
                        )}
                      />
                    );
                  })}
                </div>

                {/* Pose actual */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Imagen de referencia */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Pose de referencia:</Label>
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 border-rose-500/30 bg-muted">
                      <Image
                        src={EXPLICIT_POSES[currentExplicitPose].image}
                        alt={EXPLICIT_POSES[currentExplicitPose].name}
                        fill
                        className="object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                        <p className="text-white font-medium text-sm">
                          {EXPLICIT_POSES[currentExplicitPose].name}
                        </p>
                        <p className="text-white/80 text-xs">
                          {EXPLICIT_POSES[currentExplicitPose].description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Área de carga para esta pose */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Tu foto:</Label>
                    {getExplicitPhotoForPose(EXPLICIT_POSES[currentExplicitPose].id) ? (
                      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl border-2 border-green-500">
                        <img
                          src={getExplicitPhotoForPose(EXPLICIT_POSES[currentExplicitPose].id)?.preview}
                          alt="Foto cargada"
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeExplicitPhoto(EXPLICIT_POSES[currentExplicitPose].id)}
                          className="absolute top-2 right-2 rounded-full bg-destructive p-2 text-destructive-foreground shadow-lg transition-transform hover:scale-110 active:scale-95"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <div className="absolute bottom-0 left-0 right-0 bg-green-500/90 p-2 flex items-center justify-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                          <span className="text-white text-sm font-medium">Foto cargada</span>
                        </div>
                      </div>
                    ) : (
                      <div
                        {...getRootPropsExplicit()}
                        className={cn(
                          "aspect-[3/4] w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all",
                          isDragActiveExplicit
                            ? "border-rose-500 bg-rose-500/10"
                            : "border-muted-foreground/25 hover:border-rose-500/50 hover:bg-rose-500/5"
                        )}
                      >
                        <input {...getInputPropsExplicit()} />
                        <ImageIcon className="h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground font-medium text-center px-4">
                          Arrastra o toca para subir
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {EXPLICIT_POSES[currentExplicitPose].description}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Resumen de fotos explícitas */}
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                  {EXPLICIT_POSES.map((pose, index) => {
                    const photo = getExplicitPhotoForPose(pose.id);
                    return (
                      <button
                        key={pose.id}
                        type="button"
                        onClick={() => setCurrentExplicitPose(index)}
                        className={cn(
                          "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                          index === currentExplicitPose
                            ? "border-rose-500 ring-2 ring-rose-500/50"
                            : photo
                            ? "border-green-500"
                            : "border-muted-foreground/30"
                        )}
                      >
                        {photo ? (
                          <img
                            src={photo.preview}
                            alt={`Pose ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full bg-muted flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">{index + 1}</span>
                          </div>
                        )}
                        {photo && (
                          <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Contador de fotos explícitas */}
                <div className={cn(
                  "flex items-center justify-center gap-2 rounded-lg py-2 px-4 text-sm font-medium",
                  canProceedExplicit
                    ? "bg-green-500/10 text-green-600"
                    : "bg-rose-500/10 text-rose-600"
                )}>
                  {canProceedExplicit ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      8 fotos explícitas cargadas
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      {explicitPhotos.length} de 8 fotos explícitas (faltan {8 - explicitPhotos.length})
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botón Siguiente */}
      <Button
        type="button"
        onClick={onNext}
        disabled={!canProceed}
        className="w-full"
        size="lg"
      >
        {!canProceed 
          ? isExplicit 
            ? `Faltan ${Math.max(0, 5 - photos.length)} fotos normales y ${8 - explicitPhotos.length} explícitas`
            : `Faltan ${5 - photos.length} fotos`
          : "Continuar con los datos"
        }
      </Button>
    </motion.div>
  );
}
