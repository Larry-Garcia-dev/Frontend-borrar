import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, X, Camera, CheckCircle2, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface PhotoStepProps {
  photos: { file: File; preview: string; url?: string }[];
  setPhotos: React.Dispatch<React.SetStateAction<{ file: File; preview: string; url?: string }[]>>;
  onNext: () => void;
}

export function PhotoStep({ photos, setPhotos, onNext }: PhotoStepProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPhotos = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    // Limitamos a 20 fotos máximo por temas de rendimiento en UI
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 20));
  }, [setPhotos]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxSize: 10 * 1024 * 1024,
  });

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const newPhotos = [...prev];
      URL.revokeObjectURL(newPhotos[index].preview);
      newPhotos.splice(index, 1);
      return newPhotos;
    });
  };

  const canProceedToStep2 = photos.length >= 5;

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ duration: 0.2 }}
    >
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
        <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6">
          <div
            {...getRootProps()}
            className={cn(
              "border-2 border-dashed rounded-xl p-6 sm:p-8 text-center cursor-pointer transition-all",
              isDragActive
                ? "border-primary bg-primary/5 scale-[1.02]"
                : "border-muted-foreground/25 hover:border-primary/50 hover:bg-secondary/50"
            )}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-muted-foreground" />
            <p className="mt-2 text-sm sm:text-base text-muted-foreground font-medium">
              {isDragActive
                ? "Suelta las fotos aquí..."
                : "Arrastra fotos o toca para seleccionar"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPG o WebP hasta 10MB
            </p>
          </div>

          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 md:grid-cols-5 lg:grid-cols-6">
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
            "mt-4 flex items-center justify-center gap-2 rounded-lg py-2 px-4 text-sm font-medium",
            canProceedToStep2
              ? "bg-green-500/10 text-green-600"
              : "bg-amber-500/10 text-amber-600"
          )}>
            {canProceedToStep2 ? (
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

          {/* Botón Siguiente */}
          <Button
            type="button"
            onClick={onNext}
            disabled={!canProceedToStep2}
            className="mt-4 w-full"
            size="lg"
          >
            Continuar con los datos
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}