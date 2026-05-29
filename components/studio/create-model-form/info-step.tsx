import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// --- Sub-componente Interno ---
function SelectWithOther({
  label, value, customValue, onValueChange, onCustomValueChange, options, placeholder = "Seleccionar",
}: {
  label: string; value: string; customValue: string;
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
            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
          ))}
          <SelectItem value="other">Otro (especificar)</SelectItem>
        </SelectContent>
      </Select>
      <AnimatePresence>
        {isOther && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
          >
            <Input
              value={customValue}
              onChange={(e) => onCustomValueChange(e.target.value)}
              placeholder="Especifica aquí..."
              className="rounded-t-none border-t-0"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Componente Principal Exportado ---
interface InfoStepProps {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
}

export function InfoStep({ formData, setFormData }: InfoStepProps) {

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  return (
    <Card>
      <CardHeader className="px-4 py-4 sm:px-6 sm:py-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <User className="h-5 w-5" />
          Información del Modelo
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Los campos con * son obligatorios
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 sm:px-6 sm:pb-6 space-y-4">
        {/* Campos Requeridos */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="model_name">Nombre de la Modelo *</Label>
            <Input
              id="model_name" name="model_name"
              value={formData.model_name} onChange={handleInputChange}
              placeholder="Nombre artístico o real" required className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="model_email">Email *</Label>
            <Input
              id="model_email" name="model_email" type="email"
              value={formData.model_email} onChange={handleInputChange}
              placeholder="email@ejemplo.com" required className="h-11"
            />
          </div>
        </div>

        {/* Campos Opcionales */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="model_phone">Teléfono</Label>
            <Input
              id="model_phone" name="model_phone" type="tel"
              value={formData.model_phone} onChange={handleInputChange}
              placeholder="+57 300 123 4567" className="h-11"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">Edad</Label>
            <Input
              id="age" name="age" type="number" min="18" max="100"
              value={formData.age} onChange={handleInputChange}
              placeholder="25" className="h-11"
            />
          </div>
        </div>

        {/* Selectores Múltiples */}
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectWithOther
            label="Género"
            value={formData.gender} customValue={formData.gender_custom}
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
            value={formData.ethnicity} customValue={formData.ethnicity_custom}
            onValueChange={(v) => handleSelectChange("ethnicity", v)}
            onCustomValueChange={(v) => handleSelectChange("ethnicity_custom", v)}
            options={[
              { value: "latina", label: "Latina" },
              { value: "caucasian", label: "Caucásica" },
              { value: "asian", label: "Asiática" },
              { value: "african", label: "Africana" },
              { value: "mixed", label: "Mestiza" },
            ]}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectWithOther
            label="Color de Cabello"
            value={formData.hair_color} customValue={formData.hair_color_custom}
            onValueChange={(v) => handleSelectChange("hair_color", v)}
            onCustomValueChange={(v) => handleSelectChange("hair_color_custom", v)}
            options={[
              { value: "black", label: "Negro" },
              { value: "brown", label: "Café" },
              { value: "blonde", label: "Rubio" },
              { value: "red", label: "Rojo" },
              { value: "gray", label: "Gris" },
            ]}
          />
          <SelectWithOther
            label="Color de Ojos"
            value={formData.eye_color} customValue={formData.eye_color_custom}
            onValueChange={(v) => handleSelectChange("eye_color", v)}
            onCustomValueChange={(v) => handleSelectChange("eye_color_custom", v)}
            options={[
              { value: "brown", label: "Café" },
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
            id="height_cm" name="height_cm" type="number" min="100" max="250"
            value={formData.height_cm} onChange={handleInputChange}
            placeholder="165" className="h-11"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Biografía / Notas adicionales</Label>
          <Textarea
            id="bio" name="bio"
            value={formData.bio} onChange={handleInputChange}
            placeholder="Información adicional sobre el modelo, características especiales, estilo, etc..."
            rows={4} className="resize-none"
          />
        </div>
      </CardContent>
    </Card>
  );
}