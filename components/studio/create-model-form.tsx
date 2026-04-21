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
import { Upload, X, Loader2, User, Camera } from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";

interface CreateModelFormProps {
  onSuccess?: () => void;
}

export function CreateModelForm({ onSuccess }: CreateModelFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [photos, setPhotos] = useState<{ file: File; preview: string; url?: string }[]>([]);
  
  const [formData, setFormData] = useState({
    model_email: "",
    model_name: "",
    model_phone: "",
    age: "",
    gender: "",
    ethnicity: "",
    hair_color: "",
    eye_color: "",
    height_cm: "",
    bio: "",
  });

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newPhotos = acceptedFiles.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));
    setPhotos((prev) => [...prev, ...newPhotos].slice(0, 20)); // Max 20 photos
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.model_email || !formData.model_name) {
      toast.error("Email y nombre son requeridos");
      return;
    }

    if (photos.length < 5) {
      toast.error("Se requieren al menos 5 fotos para el entrenamiento de IA");
      return;
    }

    setIsSubmitting(true);

    try {
      // First upload photos
      setUploadingPhotos(true);
      const filesToUpload = photos.filter((p) => !p.url).map((p) => p.file);
      
      let uploadedUrls: string[] = [];
      if (filesToUpload.length > 0) {
        const uploadResult = await api.uploadTrainingPhotos(filesToUpload);
        uploadedUrls = uploadResult.urls;
      }

      // Combine already uploaded URLs with new ones
      const allUrls = [
        ...photos.filter((p) => p.url).map((p) => p.url!),
        ...uploadedUrls,
      ];

      setUploadingPhotos(false);

      // Create model request
      await api.requestModelCreation({
        model_email: formData.model_email,
        model_name: formData.model_name,
        model_phone: formData.model_phone || undefined,
        training_photos: allUrls,
        model_info: {
          age: formData.age ? parseInt(formData.age) : undefined,
          gender: formData.gender || undefined,
          ethnicity: formData.ethnicity || undefined,
          hair_color: formData.hair_color || undefined,
          eye_color: formData.eye_color || undefined,
          height_cm: formData.height_cm ? parseInt(formData.height_cm) : undefined,
          bio: formData.bio || undefined,
        },
      });

      toast.success("Solicitud enviada exitosamente. Pendiente de aprobacion.");
      
      // Reset form
      setFormData({
        model_email: "",
        model_name: "",
        model_phone: "",
        age: "",
        gender: "",
        ethnicity: "",
        hair_color: "",
        eye_color: "",
        height_cm: "",
        bio: "",
      });
      photos.forEach((p) => URL.revokeObjectURL(p.preview));
      setPhotos([]);
      
      onSuccess?.();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al enviar solicitud");
    } finally {
      setIsSubmitting(false);
      setUploadingPhotos(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Photos Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Fotos de Entrenamiento
          </CardTitle>
          <CardDescription>
            Sube al menos 5 fotos de alta calidad del modelo. Estas fotos se usaran para entrenar la IA.
            Incluye diferentes angulos, expresiones y fondos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25 hover:border-primary/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
            <p className="mt-2 text-sm text-muted-foreground">
              {isDragActive
                ? "Suelta las fotos aqui..."
                : "Arrastra fotos aqui o haz clic para seleccionar"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              PNG, JPG o WebP hasta 10MB (minimo 5 fotos, maximo 20)
            </p>
          </div>

          {photos.length > 0 && (
            <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5 md:grid-cols-6">
              {photos.map((photo, index) => (
                <div key={index} className="group relative aspect-square">
                  <img
                    src={photo.preview}
                    alt={`Foto ${index + 1}`}
                    className="h-full w-full rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(index)}
                    className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <p className="mt-2 text-sm text-muted-foreground">
            {photos.length} de 5+ fotos ({photos.length >= 5 ? "Listo" : `faltan ${5 - photos.length}`})
          </p>
        </CardContent>
      </Card>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informacion Basica
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="model_name">Nombre del Modelo *</Label>
            <Input
              id="model_name"
              name="model_name"
              value={formData.model_name}
              onChange={handleInputChange}
              placeholder="Nombre artistico o real"
              required
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model_phone">Telefono</Label>
            <Input
              id="model_phone"
              name="model_phone"
              type="tel"
              value={formData.model_phone}
              onChange={handleInputChange}
              placeholder="+57 300 123 4567"
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
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gender">Genero</Label>
            <Select
              value={formData.gender}
              onValueChange={(value) => handleSelectChange("gender", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Femenino</SelectItem>
                <SelectItem value="male">Masculino</SelectItem>
                <SelectItem value="non-binary">No binario</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ethnicity">Etnia</Label>
            <Select
              value={formData.ethnicity}
              onValueChange={(value) => handleSelectChange("ethnicity", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latina">Latina</SelectItem>
                <SelectItem value="caucasian">Caucasica</SelectItem>
                <SelectItem value="asian">Asiatica</SelectItem>
                <SelectItem value="african">Africana</SelectItem>
                <SelectItem value="mixed">Mestiza</SelectItem>
                <SelectItem value="other">Otra</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="hair_color">Color de Cabello</Label>
            <Select
              value={formData.hair_color}
              onValueChange={(value) => handleSelectChange("hair_color", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="black">Negro</SelectItem>
                <SelectItem value="brown">Cafe</SelectItem>
                <SelectItem value="blonde">Rubio</SelectItem>
                <SelectItem value="red">Rojo</SelectItem>
                <SelectItem value="gray">Gris</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="eye_color">Color de Ojos</Label>
            <Select
              value={formData.eye_color}
              onValueChange={(value) => handleSelectChange("eye_color", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brown">Cafe</SelectItem>
                <SelectItem value="black">Negro</SelectItem>
                <SelectItem value="blue">Azul</SelectItem>
                <SelectItem value="green">Verde</SelectItem>
                <SelectItem value="hazel">Miel</SelectItem>
                <SelectItem value="gray">Gris</SelectItem>
              </SelectContent>
            </Select>
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
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bio">Biografia / Notas</Label>
            <Textarea
              id="bio"
              name="bio"
              value={formData.bio}
              onChange={handleInputChange}
              placeholder="Informacion adicional sobre el modelo..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit */}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={isSubmitting || photos.length < 5}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {uploadingPhotos ? "Subiendo fotos..." : "Enviando solicitud..."}
          </>
        ) : (
          "Enviar Solicitud de Modelo"
        )}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        La solicitud sera revisada por un administrador. Se requiere pago para completar el proceso.
      </p>
    </form>
  );
}
