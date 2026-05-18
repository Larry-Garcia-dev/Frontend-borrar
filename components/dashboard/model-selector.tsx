"use client";

import { useEffect } from "react";
import { Users } from "lucide-react";
import { useModelsStore } from "@/lib/store/models-store";

interface ModelSelectorProps {
  selectedModelUserId: string | null;
  onSelect: (userId: string | null) => void;
}

export function ModelSelector({ selectedModelUserId, onSelect }: ModelSelectorProps) {
  const { modelsForSelect, fetchModelsForSelect } = useModelsStore();

  useEffect(() => {
    fetchModelsForSelect();
  }, [fetchModelsForSelect]);

  if (modelsForSelect.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-base font-medium text-foreground">
        <Users className="h-4 w-4 text-primary" />
        Seleccionar Modelo
      </label>
      <select
        value={selectedModelUserId || ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        <option value="">Selecciona una modelo...</option>
        {modelsForSelect.map((model) => (
          <option key={model.id} value={model.user_id}>
            {model.display_name}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted-foreground">
        Las imagenes se guardaran en la carpeta de la modelo seleccionada.
      </p>
    </div>
  );
}
