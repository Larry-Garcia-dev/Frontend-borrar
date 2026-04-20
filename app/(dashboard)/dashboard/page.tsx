"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  Download,
  RefreshCw,
  Settings2,
  ChevronDown,
  Wand2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ParticleLoader } from "@/components/ui/particle-loader";
import { useGenerationStore } from "@/lib/store/generation-store";
import { useAuthStore } from "@/lib/store/auth-store";
import { cn } from "@/lib/utils";

const aspectRatios = [
  { label: "1:1", width: 1024, height: 1024 },
  { label: "16:9", width: 1344, height: 768 },
  { label: "9:16", width: 768, height: 1344 },
  { label: "4:3", width: 1152, height: 896 },
  { label: "3:4", width: 896, height: 1152 },
];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const {
    prompt,
    setPrompt,
    negativePrompt,
    setNegativePrompt,
    width,
    height,
    setWidth,
    setHeight,
    steps,
    setSteps,
    guidance,
    setGuidance,
    seed,
    setSeed,
    isGenerating,
    progress,
    currentGeneration,
    error,
    generate,
    clearError,
  } = useGenerationStore();

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedRatio, setSelectedRatio] = useState("1:1");

  const handleRatioChange = (ratio: (typeof aspectRatios)[0]) => {
    setSelectedRatio(ratio.label);
    setWidth(ratio.width);
    setHeight(ratio.height);
  };

  const handleGenerate = async () => {
    clearError();
    await generate();
  };

  const remainingCredits = user ? user.quota - user.used_quota : 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl font-bold text-foreground">Genera tu imagen</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Describe lo que quieres crear y deja que la IA haga su magia
        </p>
      </motion.div>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Generation Form */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-2xl">
                  <Wand2 className="h-6 w-6 text-primary" />
                  Configuracion
                </CardTitle>
                <div className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {remainingCredits} creditos
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Prompt */}
              <div className="space-y-3">
                <label className="block text-lg font-semibold text-foreground">
                  Describe tu imagen
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ej: Un paisaje magico con montanas flotantes y auroras boreales..."
                  className="h-36 w-full resize-none rounded-xl border-2 border-input bg-card p-4 text-lg text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>

              {/* Aspect Ratio */}
              <div className="space-y-3">
                <label className="block text-lg font-semibold text-foreground">
                  Proporcion de imagen
                </label>
                <div className="flex flex-wrap gap-2">
                  {aspectRatios.map((ratio) => (
                    <button
                      key={ratio.label}
                      onClick={() => handleRatioChange(ratio)}
                      className={cn(
                        "rounded-lg border-2 px-4 py-2 text-base font-medium transition-all",
                        selectedRatio === ratio.label
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {ratio.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Advanced Options Toggle */}
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex w-full items-center justify-between rounded-lg border border-border bg-secondary/50 px-4 py-3 text-base font-medium transition-colors hover:bg-secondary"
              >
                <div className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Opciones avanzadas
                </div>
                <ChevronDown
                  className={cn(
                    "h-5 w-5 transition-transform",
                    showAdvanced && "rotate-180"
                  )}
                />
              </button>

              {/* Advanced Options */}
              <AnimatePresence>
                {showAdvanced && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6 overflow-hidden"
                  >
                    {/* Negative Prompt */}
                    <div className="space-y-3">
                      <label className="block text-base font-medium text-foreground">
                        Prompt negativo (que evitar)
                      </label>
                      <textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="Ej: borroso, baja calidad, texto, marcas de agua..."
                        className="h-24 w-full resize-none rounded-xl border-2 border-input bg-card p-4 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                      />
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-base font-medium text-foreground">
                          Pasos de inferencia
                        </label>
                        <span className="rounded-lg bg-secondary px-3 py-1 text-sm font-medium">
                          {steps}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={50}
                        value={steps}
                        onChange={(e) => setSteps(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>

                    {/* Guidance */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-base font-medium text-foreground">
                          Escala de guia
                        </label>
                        <span className="rounded-lg bg-secondary px-3 py-1 text-sm font-medium">
                          {guidance.toFixed(1)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={1}
                        max={20}
                        step={0.5}
                        value={guidance}
                        onChange={(e) => setGuidance(Number(e.target.value))}
                        className="w-full accent-primary"
                      />
                    </div>

                    {/* Seed */}
                    <div className="space-y-3">
                      <label className="text-base font-medium text-foreground">
                        Seed (opcional)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          value={seed || ""}
                          onChange={(e) =>
                            setSeed(e.target.value ? Number(e.target.value) : null)
                          }
                          placeholder="Aleatorio"
                          className="flex-1 rounded-xl border-2 border-input bg-card px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                        <Button
                          variant="secondary"
                          onClick={() => setSeed(Math.floor(Math.random() * 999999999))}
                        >
                          <RefreshCw className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Error */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-lg bg-destructive/10 p-4 text-center text-destructive"
                >
                  {error}
                </motion.div>
              )}

              {/* Generate Button */}
              <Button
                variant="gradient"
                size="xl"
                className="w-full"
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim() || remainingCredits <= 0}
                isLoading={isGenerating}
              >
                {!isGenerating && <Sparkles className="h-6 w-6" />}
                {isGenerating ? "Generando..." : "Generar Imagen"}
              </Button>

              {remainingCredits <= 0 && (
                <p className="text-center text-sm text-destructive">
                  No tienes creditos disponibles. Contacta al administrador.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* Preview Area */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="text-2xl">Resultado</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border border-border bg-secondary/50">
                <AnimatePresence mode="wait">
                  {isGenerating ? (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex h-full items-center justify-center"
                    >
                      <ParticleLoader
                        message="Creando tu imagen..."
                        progress={progress}
                      />
                    </motion.div>
                  ) : currentGeneration ? (
                    <motion.div
                      key="result"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="relative h-full"
                    >
                      <img
                        src={currentGeneration.image_url}
                        alt={currentGeneration.prompt}
                        className="h-full w-full object-contain"
                      />
                      {/* Action buttons */}
                      <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2">
                        <Button
                          variant="secondary"
                          size="sm"
                          className="glass"
                          onClick={() => {
                            const link = document.createElement("a");
                            link.href = currentGeneration.image_url;
                            link.download = `macondo-${currentGeneration.id}.png`;
                            link.click();
                          }}
                        >
                          <Download className="h-4 w-4" />
                          Descargar
                        </Button>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="glass"
                          onClick={handleGenerate}
                        >
                          <RefreshCw className="h-4 w-4" />
                          Regenerar
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex h-full flex-col items-center justify-center p-8 text-center"
                    >
                      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-primary/20 to-accent/20">
                        <Sparkles className="h-10 w-10 text-primary" />
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">
                        Tu imagen aparecera aqui
                      </h3>
                      <p className="mt-2 text-muted-foreground">
                        Escribe un prompt y presiona generar
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Generation info */}
              {currentGeneration && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 rounded-xl bg-secondary/50 p-4"
                >
                  <p className="text-sm text-muted-foreground">Prompt utilizado:</p>
                  <p className="mt-1 text-base text-foreground">
                    {currentGeneration.prompt}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-md bg-background px-2 py-1">
                      {currentGeneration.width}x{currentGeneration.height}
                    </span>
                    <span className="rounded-md bg-background px-2 py-1">
                      Seed: {currentGeneration.seed}
                    </span>
                  </div>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
