"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { PhotoStep } from "./photo-step";
import { InfoStep } from "./info-step";
import { ResourceStep } from "./resource-step";
import { useAuthStore } from "@/lib/store/auth-store";

interface CreateModelFormProps {
  onSuccess?: () => void;
}

export function CreateModelForm({ onSuccess }: CreateModelFormProps) {
  const { user: studioUser } = useAuthStore();
  const [step, setStep] = useState(1);
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
    assigned_credits: 10,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (photos.length < 5) return toast.error("Se requieren al menos 5 fotos.");

    // Validación de lógica de créditos: No puede asignar más de lo que el estudio tiene en total
    if (formData.assigned_credits > (studioUser?.dailyLimit || 0)) {
      return toast.error(`No puedes asignar ${formData.assigned_credits} fotos. El límite total de tu estudio es ${studioUser?.dailyLimit}.`);
    }

    setIsSubmitting(true);
    try {
      setUploadingPhotos(true);
      const filesToUpload = photos.filter(p => !p.url).map(p => p.file);
      const { urls } = await api.uploadTrainingPhotos(filesToUpload);
      
      await api.requestModelCreation({
        model_email: formData.model_email,
        model_name: formData.model_name,
        model_phone: formData.model_phone || undefined,
        training_photos: urls,
        model_info: { 
          ...formData, 
          assigned_daily_limit: formData.assigned_credits // Enviamos la cuota al backend
        },
      });

      toast.success("Solicitud enviada exitosamente.");
      onSuccess?.();
    } catch (error: any) {
      toast.error(error.message || "Error al enviar solicitud");
    } finally {
      setIsSubmitting(false);
      setUploadingPhotos(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <PhotoStep 
            key="step1" 
            photos={photos} 
            setPhotos={setPhotos} 
            onNext={() => setStep(2)} 
          />
        ) : (
          <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <ResourceStep 
              assignedCredits={formData.assigned_credits} 
              onChange={(val) => setFormData({...formData, assigned_credits: val})} 
            />
            
            <InfoStep 
              formData={formData} 
              setFormData={setFormData} 
            />

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>Volver</Button>
              <Button type="submit" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {uploadingPhotos ? "Subiendo fotos..." : "Enviando..."}</> : "Enviar Solicitud"}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}