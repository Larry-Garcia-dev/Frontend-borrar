"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  User, 
  Shirt, 
  ZoomIn, 
  Sun,
  ChevronDown,
  X
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// Prompts predefinidos para cada opción de edición
const EDIT_OPTIONS = {
  smoothSkin: {
    id: "smoothSkin",
    label: "Piel suave",
    icon: Sparkles,
    prompt: "Aplica una textura de piel suave y uniforme, reduciendo imperfecciones manteniendo naturalidad",
    requiresInput: false,
  },
  realisticSkin: {
    id: "realisticSkin",
    label: "Piel realista",
    icon: User,
    prompt: "Mejora el realismo de la piel con textura natural, poros visibles y tonos de piel variados",
    requiresInput: false,
  },
  changeClothes: {
    id: "changeClothes",
    label: "Cambio de ropa",
    icon: Shirt,
    prompt: "Cambia la ropa por: ",
    requiresInput: true,
    inputPlaceholder: "Describe la ropa (ej: vestido rojo elegante)",
  },
  upscale: {
    id: "upscale",
    label: "Mejorar calidad",
    icon: ZoomIn,
    prompt: "Aumenta la calidad y resolución de la imagen, mejorando detalles y nitidez",
    requiresInput: false,
  },
  lighting: {
    id: "lighting",
    label: "Cambiar iluminación",
    icon: Sun,
    prompt: "Mejora la iluminación de la imagen con luz más suave y natural",
    requiresInput: false,
  },
} as const;

type EditOptionKey = keyof typeof EDIT_OPTIONS;

interface EditOptionsPanelProps {
  onSelectOption: (promptToAdd: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export function EditOptionsPanel({ 
  onSelectOption, 
  isExpanded = true,
  onToggleExpand 
}: EditOptionsPanelProps) {
  const [activeOption, setActiveOption] = useState<EditOptionKey | null>(null);
  const [clothesInput, setClothesInput] = useState("");

  const handleOptionClick = (optionKey: EditOptionKey) => {
    const option = EDIT_OPTIONS[optionKey];
    
    if (option.requiresInput) {
      // Toggle the input field for options that require input
      setActiveOption(activeOption === optionKey ? null : optionKey);
    } else {
      // Directly apply the prompt
      onSelectOption(option.prompt);
      setActiveOption(null);
    }
  };

  const handleClothesSubmit = () => {
    if (clothesInput.trim()) {
      const option = EDIT_OPTIONS.changeClothes;
      onSelectOption(`${option.prompt}${clothesInput.trim()}`);
      setClothesInput("");
      setActiveOption(null);
    }
  };

  const handleClothesKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleClothesSubmit();
    }
    if (e.key === "Escape") {
      setActiveOption(null);
      setClothesInput("");
    }
  };

  return (
    <div className="space-y-3">
      <button
        onClick={onToggleExpand}
        className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          EDICIÓN RÁPIDA
        </span>
        <ChevronDown className={cn(
          "h-4 w-4 transition-transform",
          isExpanded && "rotate-180"
        )} />
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-2">
              {(Object.keys(EDIT_OPTIONS) as EditOptionKey[]).map((key) => {
                const option = EDIT_OPTIONS[key];
                const Icon = option.icon;
                const isActive = activeOption === key;

                return (
                  <div key={key} className="space-y-2">
                    <button
                      onClick={() => handleOptionClick(key)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all",
                        "border border-border hover:border-primary/50 hover:bg-primary/5",
                        isActive && "border-primary bg-primary/10"
                      )}
                    >
                      <div className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg",
                        "bg-secondary/80",
                        isActive && "bg-primary/20"
                      )}>
                        <Icon className={cn(
                          "h-4 w-4",
                          isActive ? "text-primary" : "text-muted-foreground"
                        )} />
                      </div>
                      <span className={cn(
                        "flex-1 text-left font-medium",
                        isActive ? "text-primary" : "text-foreground"
                      )}>
                        {option.label}
                      </span>
                      {option.requiresInput && (
                        <ChevronDown className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          isActive && "rotate-180"
                        )} />
                      )}
                    </button>

                    {/* Input for clothes change */}
                    <AnimatePresence>
                      {isActive && option.requiresInput && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="flex gap-2 pl-11 pr-1">
                            <Input
                              value={clothesInput}
                              onChange={(e) => setClothesInput(e.target.value)}
                              onKeyDown={handleClothesKeyDown}
                              placeholder={option.inputPlaceholder}
                              className="h-9 text-sm"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              onClick={handleClothesSubmit}
                              disabled={!clothesInput.trim()}
                              className="h-9 px-3"
                            >
                              Aplicar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setActiveOption(null);
                                setClothesInput("");
                              }}
                              className="h-9 px-2"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-xs text-muted-foreground">
              Selecciona una opción para agregar instrucciones al prompt
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
