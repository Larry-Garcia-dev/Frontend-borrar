"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, X, Loader2, User, Camera, CheckCircle2, AlertCircle } from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CreateModelFormProps {
  onSuccess?: () => void;
}

// Custom select component with "other" option support
function SelectWithOther({
  label,
  value,
  customValue,
  onValueChange,
  onCustomValueChange,
  options,
  placeholder = "Seleccionar",
}: {
  label: string;
  value: string;
  customValue: string;
  onValueChange: (value: string) => void;
  onCustomValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const isOther = value === "other";

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={cn(isOther && "rounded-b-none border-b-0")}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
          <SelectItem value="other">Otro (especificar)</SelectItem>
        </SelectContent>
      </Select>
      <AnimatePresence>
        {isOther && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Input
              value={customValue}
              onChange={(e) => onCustomValueChange(e.target.value)}
              placeholder="Especifica aqui..."
              className="rounded-t-none border-t-0"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function CreateModelForm({ onSuccess }: CreateModelFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; preview: string; url?: string }[]>([]);
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    model_email: "",
    model_name: "",
    model_phone: "",
    age: "",
    gender: "",
    gender_custom: "",
    ethnicity: "",
    ethnicity_custom: "",
    hair_color: "",
    hair_color_custom: "",
    eye_color: "",
    eye_color_custom: "",
    height_cm: "",
    bio: "",
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPhotos = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 20));
  }, []);

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

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const getFieldValue = (field: string) => {
    const value = formData[field as keyof typeof formData];
    const customValue = formData[`${field}_custom` as keyof typeof formData];
    return value === "other" && customValue ? customValue : value;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.model_email || !formData.model_name) {
      toast.error("Email y nombre son requeridos");
      return;
    }

    if (photos.length < 5) {
      toast.error("Se requieren al menos 5 fotos para el entrenamiento de IA");
      setStep(1);
      return;
    }

    setIsSubmitting(true);

    try {
      setUploadingPhotos(true);
      const filesToUpload = photos.filter((p) => !p.url).map((p) => p.file);
      
      let uploadedUrls: string[] = [];
      if (filesToUpload.length > 0) {
        const uploadResult = await api.uploadTrainingPhotos(filesToUpload);
        uploadedUrls = uploadResult.urls;
      }

      const allUrls = [
        ...photos.filter((p) => p.url).map((p) => p.url!),
        ...uploadedUrls,
      ];

      setUploadingPhotos(false);

      await api.requestModelCreation({
        model_email: formData.model_email,
        model_name: formData.model_name,
        model_phone: formData.model_phone || undefined,
        training_photos: allUrls,
        model_info: {
          age: formData.age ? parseInt(formData.age) : undefined,
          gender: getFieldValue("gender") || undefined,
          ethnicity: getFieldValue("ethnicity") || undefined,
          hair_color: getFieldValue("hair_color") || undefined,
          eye_color: getFieldValue("eye_color") || undefined,
          height_cm: formData.height_cm ? parseInt(formData.height_cm) : undefined,
          bio: formData.bio || undefined,
        },
      });

      toast.success("Solicitud enviada exitosamente. Pendiente de aprobacion.");
      
      setFormData({
        model_email: "",
        model_name: "",
        model_phone: "",
        age: "",
        gender: "",
        gender_custom: "",
        ethnicity: "",
        ethnicity_custom: "",
        hair_color: "",
        hair_color_custom: "",
        eye_color: "",
        eye_color_custom: "",
        height_cm: "",
        bio: "",
      });
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      setStep(1);
      
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al enviar solicitud");
    } finally {
      setIsSubmitting(false);
      setUploadingPhotos(false);
    }
  };

  const canProceedToStep2 = photos.length >= 5;
  const canSubmit = canProceedToStep2 && formData.model_email && formData.model_name;

  return (
    <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 sm:gap-4 mb-4 sm:mb-6">
        <button
          type="button"
          onClick={() => setStep(1)}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all",
            step === 1
              ? "bg-primary text-primary-foreground"
              : photos.length >= 5
              ? "bg-green-500/20 text-green-600"
              : "bg-secondary text-secondary-foreground"
          )}
        >
          {photos.length >= 5 ? (
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          ) : (
            <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          )}
          <span className="hidden xs:inline">1.</span> Fotos
        </button>
        <div className="h-px w-6 sm:w-12 bg-border" />
        <button
          type="button"
          onClick={() => canProceedToStep2 && setStep(2)}
          disabled={!canProceedToStep2}
          className={cn(
            "flex items-center gap-1.5 sm:gap-2 rounded-full px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all",
            step === 2
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground",
            !canProceedToStep2 && "opacity-50 cursor-not-allowed"
          )}
        >
          <User className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          <span className="hidden xs:inline">2.</span> Datos
        </button>
      </div>

      <AnimatePresence mode="wait">
        {step === 1 && (
          <motion.div
            key="step1"
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
                  Sube al menos 5 fotos de alta calidad. Incluye diferentes angulos, expresiones y fondos.
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
                      ? "Suelta las fotos aqui..."
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

                {/* Photo counter */}
                <div className={cn(
                  "mt-4 flex items-center justify-center gap-2 rounded-lg py-2 px-4 text-sm font-medium",
                  photos.length >= 5
                    ? "bg-green-500/10 text-green-600"
                    : "bg-amber-500/10 text-amber-600"
                )}>
                  {photos.length >= 5 ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      {photos.length} fotos cargadas
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4" />
                      {photos.length} de 5 fotos minimas (faltan {5 - photos.length})
                    </>
                  )}
                </div>

                {/* Next button */}
                <Button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!canProceedToStep2}
                  className="mt-4 w-full"
                  size="lg"
                >
                  Continuar con los datos
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Basic Info Card */}
            <Card>
              <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
                <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                  <User className="h-5 w-5" />
                  Informacion del Modelo
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Los campos con * son obligatorios
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4">
                {/* Required fields */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="model_name">Nombre del Modelo *</Label>
                    <Input
                      id="model_name"
                      name="model_name"
                      value={formData.model_name}
                      onChange={handleInputChange}
                      placeholder="Nombre artistico o real"
                      required
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model_email">Email *</Label>
                    <Input
                      id="model_email"
                      name="model_email"
                      type="email"
                      value={formData.model_email}
                      onChange={handleInputChange}
                      placeholder="email@ejemplo.com"
                      required
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="model_phone">Telefono</Label>
                    <Input
                      id="model_phone"
                      name="model_phone"
                      type="tel"
                      value={formData.model_phone}
                      onChange={handleInputChange}
                      placeholder="+57 300 123 4567"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="age">Edad</Label>
                    <Input
                      id="age"
                      name="age"
                      type="number"
                      min="18"
                      max="100"
                      value={formData.age}
                      onChange={handleInputChange}
                      placeholder="25"
                      className="h-11"
                    />
                  </div>
                </div>

                {/* Characteristics with "Other" option */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectWithOther
                    label="Genero"
                    value={formData.gender}
                    customValue={formData.gender_custom}
                    onValueChange={(v) => handleSelectChange("gender", v)}
                    onCustomValueChange={(v) => handleSelectChange("gender_custom", v)}
                    options={[
                      { value: "female", label: "Femenino" },
                      { value: "male", label: "Masculino" },
                      { value: "non-binary", label: "No binario" },
                    ]}
                  />

                  <SelectWithOther
                    label="Etnia"
                    value={formData.ethnicity}
                    customValue={formData.ethnicity_custom}
                    onValueChange={(v) => handleSelectChange("ethnicity", v)}
                    onCustomValueChange={(v) => handleSelectChange("ethnicity_custom", v)}
                    options={[
                      { value: "latina", label: "Latina" },
                      { value: "caucasian", label: "Caucasica" },
                      { value: "asian", label: "Asiatica" },
                      { value: "african", label: "Africana" },
                      { value: "mixed", label: "Mestiza" },
                    ]}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <SelectWithOther
                    label="Color de Cabello"
                    value={formData.hair_color}
                    customValue={formData.hair_color_custom}
                    onValueChange={(v) => handleSelectChange("hair_color", v)}
                    onCustomValueChange={(v) => handleSelectChange("hair_color_custom", v)}
                    options={[
                      { value: "black", label: "Negro" },
                      { value: "brown", label: "Cafe" },
                      { value: "blonde", label: "Rubio" },
                      { value: "red", label: "Rojo" },
                      { value: "gray", label: "Gris" },
                    ]}
                  />

                  <SelectWithOther
                    label="Color de Ojos"
                    value={formData.eye_color}
                    customValue={formData.eye_color_custom}
                    onValueChange={(v) => handleSelectChange("eye_color", v)}
                    onCustomValueChange={(v) => handleSelectChange("eye_color_custom", v)}
                    options={[
                      { value: "brown", label: "Cafe" },
                      { value: "black", label: "Negro" },
                      { value: "blue", label: "Azul" },
                      { value: "green", label: "Verde" },
                      { value: "hazel", label: "Miel" },
                      { value: "gray", label: "Gris" },
                    ]}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="height_cm">Estatura (cm)</Label>
                  <Input
                    id="height_cm"
                    name="height_cm"
                    type="number"
                    min="100"
                    max="250"
                    value={formData.height_cm}
                    onChange={handleInputChange}
                    placeholder="165"
                    className="h-11"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bio">Biografia / Notas adicionales</Label>
                  <Textarea
                    id="bio"
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    placeholder="Informacion adicional sobre el modelo, caracteristicas especiales, estilo, etc..."
                    rows={4}
                    className="resize-none"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Action buttons */}
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
                className="order-2 sm:order-1"
              >
                Volver a fotos
              </Button>
              
              <Button
                type="submit"
                size="lg"
                className="order-1 sm:order-2"
                disabled={isSubmitting || !canSubmit}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {uploadingPhotos ? "Subiendo fotos..." : "Enviando..."}
                  </>
                ) : (
                  "Enviar Solicitud"
                )}
              </Button>
            </div>

            <p className="text-center text-xs sm:text-sm text-muted-foreground">
              La solicitud sera revisada por un administrador. Se requiere pago para completar el proceso.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}
